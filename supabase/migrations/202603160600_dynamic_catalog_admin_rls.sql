/*
  Dynamic Fabric Catalog + Admin Security

  - Ensures `fabrics` supports both requested fields and existing legacy fields
  - Enables RLS with public read and admin-only writes
  - Creates public storage bucket `fabric-images` with admin-only uploads
*/

-- 1) Ensure fabrics table exists with requested shape for new installs.
CREATE TABLE IF NOT EXISTS fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  length numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  availability boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Backward-compatible columns for existing installs with legacy schema.
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS length numeric;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS availability boolean DEFAULT true;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3) Backfill new columns from legacy columns when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'fabric_name'
  ) THEN
    UPDATE fabrics
    SET name = COALESCE(name, fabric_name)
    WHERE name IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'fabric_type'
  ) THEN
    UPDATE fabrics
    SET type = COALESCE(type, fabric_type)
    WHERE type IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'available_length'
  ) THEN
    UPDATE fabrics
    SET length = COALESCE(length, available_length)
    WHERE length IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'price_per_meter'
  ) THEN
    UPDATE fabrics
    SET price = COALESCE(price, price_per_meter)
    WHERE price IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'fabric_image'
  ) THEN
    UPDATE fabrics
    SET image_url = COALESCE(image_url, fabric_image)
    WHERE image_url IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'availability_status'
  ) THEN
    UPDATE fabrics
    SET availability = COALESCE(availability, availability_status = 'available')
    WHERE availability IS NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_fabrics_created_at ON fabrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabrics_availability ON fabrics(availability);

-- 4) Admin helper that checks both customers and users tables for role=admin.
CREATE OR REPLACE FUNCTION is_admin_marketplace()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  customer_admin boolean := false;
  users_admin boolean := false;
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM customers WHERE id = auth.uid() AND role = ''admin'')'
      INTO customer_admin;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')'
      INTO users_admin;
  END IF;

  RETURN customer_admin OR users_admin;
END;
$$;

-- 5) RLS policies: public read, admin write.
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabrics_public_read_anon ON fabrics;
DROP POLICY IF EXISTS fabrics_public_read_auth ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_insert ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_update ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_delete ON fabrics;

CREATE POLICY fabrics_public_read_anon
  ON fabrics FOR SELECT TO anon
  USING (true);

CREATE POLICY fabrics_public_read_auth
  ON fabrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY fabrics_admin_insert
  ON fabrics FOR INSERT TO authenticated
  WITH CHECK (is_admin_marketplace());

CREATE POLICY fabrics_admin_update
  ON fabrics FOR UPDATE TO authenticated
  USING (is_admin_marketplace())
  WITH CHECK (is_admin_marketplace());

CREATE POLICY fabrics_admin_delete
  ON fabrics FOR DELETE TO authenticated
  USING (is_admin_marketplace());

-- 6) Storage bucket and policies for fabric image upload.
INSERT INTO storage.buckets (id, name, public)
SELECT 'fabric-images', 'fabric-images', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'fabric-images'
);

DROP POLICY IF EXISTS fabric_images_public_read ON storage.objects;
DROP POLICY IF EXISTS fabric_images_admin_insert ON storage.objects;
DROP POLICY IF EXISTS fabric_images_admin_update ON storage.objects;
DROP POLICY IF EXISTS fabric_images_admin_delete ON storage.objects;

CREATE POLICY fabric_images_public_read
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'fabric-images');
    
CREATE POLICY fabric_images_admin_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fabric-images' AND is_admin_marketplace());

CREATE POLICY fabric_images_admin_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fabric-images' AND is_admin_marketplace())
  WITH CHECK (bucket_id = 'fabric-images' AND is_admin_marketplace());

CREATE POLICY fabric_images_admin_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fabric-images' AND is_admin_marketplace());
