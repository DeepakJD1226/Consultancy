/*
  # Fix client insert and catalog read policies

  1. Add invoice INSERT policy for authenticated users
  2. Allow authenticated users to read all products so historical bookings
     continue to render even if a product is later marked unavailable
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Users can insert invoices for own bookings'
  ) THEN
    CREATE POLICY "Users can insert invoices for own bookings"
      ON invoices FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM bookings
          WHERE bookings.id = invoices.booking_id
            AND bookings.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Authenticated can view all products'
  ) THEN
    CREATE POLICY "Authenticated can view all products"
      ON products FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
