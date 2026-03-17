/*
  RK Textiles: Admin role, fabrics compatibility, seed data, and bill-ready orders schema
*/

-- Ensure helper exists for role-based policies.
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

-- Promote configured admin email to admin in profile tables.
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    UPDATE customers SET role = 'admin' WHERE lower(email) = 'deepakj.23aid@kongu.edu';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    UPDATE users SET role = 'admin' WHERE lower(email) = 'deepakj.23aid@kongu.edu';
  END IF;
END;
$$;

-- Ensure fabrics has required columns.
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS availability boolean DEFAULT true;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Ensure mills has id column for requested seed style.
DO $$
BEGIN
  IF to_regclass('public.mills') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mills' AND column_name = 'id'
    ) THEN
      ALTER TABLE mills ADD COLUMN id uuid;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mills' AND column_name = 'mill_id'
    ) THEN
      EXECUTE 'UPDATE mills SET id = COALESCE(id, mill_id)';
    END IF;

    EXECUTE 'UPDATE mills SET id = COALESCE(id, gen_random_uuid())';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'mills_id_unique'
    ) THEN
      ALTER TABLE mills ADD CONSTRAINT mills_id_unique UNIQUE (id);
    END IF;
  END IF;
END;
$$;

-- Seed required fabrics idempotently using first three mills.
WITH ranked_mills AS (
  SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS rn
  FROM mills
),
seed_data AS (
  SELECT * FROM (VALUES
    ('Premium Cotton','Cotton','White',500::numeric,120::numeric,1),
    ('Soft Cotton','Cotton','Grey',400::numeric,110::numeric,1),
    ('Luxury Silk','Silk','Red',150::numeric,350::numeric,2),
    ('Raw Silk','Silk','Gold',120::numeric,320::numeric,2),
    ('Classic Denim','Denim','Blue',300::numeric,200::numeric,3),
    ('Stretch Denim','Denim','Dark Blue',250::numeric,210::numeric,3),
    ('Rayon Soft','Rayon','Pink',200::numeric,180::numeric,1),
    ('Chiffon Light','Chiffon','Sky Blue',150::numeric,220::numeric,1),
    ('Velvet Royal','Velvet','Maroon',100::numeric,400::numeric,2),
    ('Satin Smooth','Satin','Black',180::numeric,260::numeric,2),
    ('Khadi Natural','Khadi','Beige',220::numeric,150::numeric,3),
    ('Wool Premium','Wool','Brown',160::numeric,300::numeric,3),
    ('Crepe Designer','Crepe','Purple',140::numeric,230::numeric,1),
    ('Organza Luxury','Organza','Silver',110::numeric,420::numeric,2),
    ('Twill Fabric','Twill','Green',210::numeric,190::numeric,3)
  ) AS t(fabric_name, fabric_type, color, available_length, price_per_meter, mill_rank)
)
INSERT INTO fabrics (fabric_name, fabric_type, color, available_length, price_per_meter, mill_id, availability)
SELECT s.fabric_name, s.fabric_type, s.color, s.available_length, s.price_per_meter, m.id, true
FROM seed_data s
JOIN ranked_mills m ON m.rn = s.mill_rank
WHERE NOT EXISTS (
  SELECT 1 FROM fabrics f
  WHERE f.fabric_name = s.fabric_name
    AND f.fabric_type = s.fabric_type
    AND f.color = s.color
);

-- Extend orders with billing fields.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_per_meter numeric(12,2);

-- RLS for orders: customers insert/read own, admins full read/update.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_insert_authenticated ON orders;
DROP POLICY IF EXISTS orders_select_own ON orders;
DROP POLICY IF EXISTS orders_select_admin ON orders;
DROP POLICY IF EXISTS orders_update_admin ON orders;

CREATE POLICY orders_insert_authenticated
  ON orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_select_own
  ON orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY orders_select_admin
  ON orders FOR SELECT TO authenticated
  USING (is_admin_marketplace());

CREATE POLICY orders_update_admin
  ON orders FOR UPDATE TO authenticated
  USING (is_admin_marketplace())
  WITH CHECK (is_admin_marketplace());

-- RLS for fabrics: public read, admin write.
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabrics_public_read_anon ON fabrics;
DROP POLICY IF EXISTS fabrics_public_read_auth ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_insert ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_update ON fabrics;
DROP POLICY IF EXISTS fabrics_admin_delete ON fabrics;

CREATE POLICY fabrics_public_read_anon
  ON fabrics FOR SELECT TO anon USING (true);

CREATE POLICY fabrics_public_read_auth
  ON fabrics FOR SELECT TO authenticated USING (true);

CREATE POLICY fabrics_admin_insert
  ON fabrics FOR INSERT TO authenticated WITH CHECK (is_admin_marketplace());

CREATE POLICY fabrics_admin_update
  ON fabrics FOR UPDATE TO authenticated
  USING (is_admin_marketplace())
  WITH CHECK (is_admin_marketplace());

CREATE POLICY fabrics_admin_delete
  ON fabrics FOR DELETE TO authenticated USING (is_admin_marketplace());
