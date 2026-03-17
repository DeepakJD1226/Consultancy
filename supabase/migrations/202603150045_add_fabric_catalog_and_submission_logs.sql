/*
  # Expand textile catalog and store all user form entries

  1. Add 15 product variants for fabric browsing page
  2. Add form_submissions table for audit logging
  3. Add RLS policies to allow authenticated/anon inserts for form audit logs
*/

-- Seed fabric catalog with 15 business-relevant textile variants.
INSERT INTO products (name, color, price_per_meter, description, is_available)
SELECT seed.name, seed.color, seed.price_per_meter, seed.description, true
FROM (
  VALUES
    ('Percale Cotton', 'White', 420.00, 'Tightly woven percale cotton ideal for crisp hotel bedsheets'),
    ('Percale Cotton', 'Ivory', 430.00, 'Soft ivory percale for premium hospitality interiors'),
    ('Sateen Cotton', 'Snow White', 520.00, 'Smooth sateen weave with subtle sheen for luxury rooms'),
    ('Sateen Cotton', 'Pearl Grey', 530.00, 'Premium sateen in neutral grey for modern hotel setups'),
    ('Organic Cotton', 'Natural', 560.00, 'Eco-friendly certified organic cotton fabric'),
    ('Organic Cotton', 'Stone Beige', 570.00, 'Organic cotton with warm neutral finish'),
    ('Linen-Cotton Blend', 'Light Grey', 610.00, 'Breathable linen-cotton blend for all-season comfort'),
    ('Linen-Cotton Blend', 'Sand', 615.00, 'Textured linen blend with refined hotel aesthetic'),
    ('T300 Cotton', 'Classic White', 640.00, '300 thread count cotton for premium bedding collections'),
    ('T300 Cotton', 'Cloud Grey', 645.00, 'High thread-count cotton in elegant grey tone'),
    ('T400 Cotton', 'Hotel White', 710.00, '400 thread count luxury cotton for flagship suites'),
    ('T400 Cotton', 'Silver Mist', 720.00, 'Ultra-soft 400 TC fabric in cool silver shade'),
    ('Cotton Jacquard', 'Champagne', 760.00, 'Decorative jacquard weave for designer hospitality lines'),
    ('Cotton Jacquard', 'Midnight Blue', 780.00, 'Statement jacquard cotton for premium branded bedding'),
    ('Flannel Cotton', 'Warm Grey', 590.00, 'Brushed flannel cotton for colder climates')
) AS seed(name, color, price_per_meter, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM products p
  WHERE p.name = seed.name
    AND p.color = seed.color
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  form_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_type ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_submissions'
      AND policyname = 'Users can view own form submissions'
  ) THEN
    CREATE POLICY "Users can view own form submissions"
      ON form_submissions FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_submissions'
      AND policyname = 'Users can insert own form submissions'
  ) THEN
    CREATE POLICY "Users can insert own form submissions"
      ON form_submissions FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_submissions'
      AND policyname = 'Anon can insert form submissions'
  ) THEN
    CREATE POLICY "Anon can insert form submissions"
      ON form_submissions FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;
