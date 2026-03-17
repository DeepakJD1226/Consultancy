/*
  # R.K. Textiles — Full Fabric Marketplace Schema

  1. Adds `role` column to `customers` for admin/customer separation
  2. Creates `mills` table for yarn/fabric manufacturers
  3. Creates `fabrics` table — the central product catalog
  4. Creates `fabric_orders` table — customer fabric orders
  5. Creates `is_admin()` helper used by RLS policies
  6. Creates `place_fabric_order()` stored procedure — atomic order placement
     that reduces available_length and auto-sets out_of_stock
  7. Full RLS on all new tables
  8. Seeds 3 mills and 15 real textile fabric types
  9. (Optional) — to grant admin to a specific user, run:
       UPDATE customers SET role = 'admin' WHERE email = 'your@email.com';
*/

-- ─────────────────────────────────────────────
-- 1. Role column on customers
-- ─────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);

-- ─────────────────────────────────────────────
-- 2. Mills
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mills (
  mill_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_name   text NOT NULL,
  location    text NOT NULL,
  contact     text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mills_name ON mills (mill_name);

-- ─────────────────────────────────────────────
-- 3. Fabrics
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fabrics (
  fabric_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_name         text NOT NULL,
  fabric_type         text NOT NULL,
  mill_id             uuid REFERENCES mills(mill_id) ON DELETE SET NULL,
  available_length    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (available_length >= 0),
  price_per_meter     numeric(10, 2) NOT NULL CHECK (price_per_meter > 0),
  color               text NOT NULL DEFAULT 'Natural',
  fabric_description  text,
  fabric_image        text,
  availability_status text NOT NULL DEFAULT 'available'
                      CHECK (availability_status IN ('available', 'out_of_stock')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fabrics_type   ON fabrics(fabric_type);
CREATE INDEX IF NOT EXISTS idx_fabrics_mill   ON fabrics(mill_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_status ON fabrics(availability_status);

-- ─────────────────────────────────────────────
-- 4. Fabric orders
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fabric_orders (
  order_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fabric_id       uuid NOT NULL REFERENCES fabrics(fabric_id) ON DELETE RESTRICT,
  customer_email  text NOT NULL,
  quantity_meters numeric(10, 2) NOT NULL CHECK (quantity_meters > 0),
  total_price     numeric(12, 2) NOT NULL,
  order_status    text NOT NULL DEFAULT 'pending'
                  CHECK (order_status IN ('pending','confirmed','shipped','delivered','cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fabric_orders_user   ON fabric_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_fabric_orders_fabric ON fabric_orders(fabric_id);
CREATE INDEX IF NOT EXISTS idx_fabric_orders_status ON fabric_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_fabric_orders_date   ON fabric_orders(created_at DESC);

-- ─────────────────────────────────────────────
-- 5. Updated_at triggers
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fabrics_updated_at ON fabrics;
CREATE TRIGGER fabrics_updated_at
  BEFORE UPDATE ON fabrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS fabric_orders_updated_at ON fabric_orders;
CREATE TRIGGER fabric_orders_updated_at
  BEFORE UPDATE ON fabric_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 6. Admin helper (used inside RLS policies)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────
-- 7. Atomic order placement function
--    Called via supabase.rpc('place_fabric_order', {...})
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION place_fabric_order(
  p_fabric_id       uuid,
  p_quantity_meters numeric,
  p_notes           text,
  p_customer_email  text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_length      numeric;
  v_price       numeric;
  v_total       numeric;
  v_order_id    uuid;
  v_new_length  numeric;
BEGIN
  -- Lock the fabric row to prevent oversell
  SELECT available_length, price_per_meter
    INTO v_length, v_price
    FROM fabrics
   WHERE fabric_id = p_fabric_id
     AND availability_status = 'available'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fabric not found or currently out of stock';
  END IF;

  IF p_quantity_meters > v_length THEN
    RAISE EXCEPTION 'Only % meters available, you requested % meters', v_length, p_quantity_meters;
  END IF;

  v_total      := p_quantity_meters * v_price;
  v_new_length := v_length - p_quantity_meters;

  INSERT INTO fabric_orders
    (user_id, fabric_id, customer_email, quantity_meters, total_price, notes)
  VALUES
    (auth.uid(), p_fabric_id, p_customer_email, p_quantity_meters, v_total, p_notes)
  RETURNING order_id INTO v_order_id;

  UPDATE fabrics
     SET available_length    = v_new_length,
         availability_status = CASE WHEN v_new_length <= 0 THEN 'out_of_stock' ELSE 'available' END
   WHERE fabric_id = p_fabric_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION place_fabric_order(uuid, numeric, text, text) TO authenticated;

-- ─────────────────────────────────────────────
-- 8. Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE mills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_orders ENABLE ROW LEVEL SECURITY;

-- Mills: any authenticated user reads; only admins write
DROP POLICY IF EXISTS "mills_read"         ON mills;
DROP POLICY IF EXISTS "mills_admin_write"  ON mills;

CREATE POLICY "mills_read"
  ON mills FOR SELECT TO authenticated USING (true);

CREATE POLICY "mills_admin_write"
  ON mills FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Fabrics: authenticated users read all; anon reads only available; admins write
DROP POLICY IF EXISTS "fabrics_auth_read" ON fabrics;
DROP POLICY IF EXISTS "fabrics_anon_read" ON fabrics;
DROP POLICY IF EXISTS "fabrics_admin_all" ON fabrics;

CREATE POLICY "fabrics_auth_read"
  ON fabrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "fabrics_anon_read"
  ON fabrics FOR SELECT TO anon USING (availability_status = 'available');

CREATE POLICY "fabrics_admin_all"
  ON fabrics FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Fabric orders: users see own; admins see all; users insert own
DROP POLICY IF EXISTS "fabric_orders_read"         ON fabric_orders;
DROP POLICY IF EXISTS "fabric_orders_user_insert"  ON fabric_orders;
DROP POLICY IF EXISTS "fabric_orders_admin_update" ON fabric_orders;

CREATE POLICY "fabric_orders_read"
  ON fabric_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "fabric_orders_user_insert"
  ON fabric_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fabric_orders_admin_update"
  ON fabric_orders FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────
-- 9. Seed: 3 Mills
-- ─────────────────────────────────────────────
INSERT INTO mills (mill_name, location, contact, description)
VALUES
  ('Rajasthan Textile Mill',   'Jaipur, Rajasthan',  '+91-141-234-5678', 'Specialist in cotton, khadi and natural-dye fabrics with 30+ years of expertise'),
  ('Gujarat Cotton House',     'Surat, Gujarat',     '+91-261-345-6789', 'Leading cotton, denim and synthetic fabric manufacturer in Western India'),
  ('Maharashtra Silk Works',   'Nashik, Maharashtra','+91-253-456-7890', 'Premium silk, satin and luxury fabric supplier for high-end fashion')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 10. Seed: 15 Fabric types
-- ─────────────────────────────────────────────
INSERT INTO fabrics
  (fabric_name, fabric_type, mill_id, available_length, price_per_meter, color, fabric_description, availability_status)
SELECT
  s.fabric_name,
  s.fabric_type,
  (SELECT mill_id FROM mills WHERE mill_name = s.mill_name LIMIT 1),
  s.available_length,
  s.price_per_meter,
  s.color,
  s.fabric_description,
  'available'
FROM (VALUES
  ('Premium Cotton Poplin',    'Cotton',    'Rajasthan Textile Mill',  500.00, 180.00, 'White',          'Fine plain-weave cotton ideal for crisp hotel bedsheets and formal shirts'),
  ('Heavy Denim Twill',        'Denim',     'Gujarat Cotton House',    350.00, 320.00, 'Indigo Blue',    'Classic 12 oz denim suitable for jeans, jackets and workwear'),
  ('Pure Silk Charmeuse',      'Silk',      'Maharashtra Silk Works',   80.00,1200.00, 'Champagne',      'Lustrous silk with satin weave structure for evening and bridal wear'),
  ('Natural Linen Slub',       'Linen',     'Rajasthan Textile Mill',  220.00, 420.00, 'Natural',        'Organic linen with characteristic slub texture for summer garments'),
  ('Recycled Polyester Jersey','Polyester', 'Gujarat Cotton House',    600.00, 150.00, 'Grey Melange',   'Eco-friendly polyester knit for sportswear and casual applications'),
  ('Bamboo Rayon Knit',        'Rayon',     'Maharashtra Silk Works',  180.00, 280.00, 'Ivory',          'Ultra-soft bamboo rayon for premium athleisure and sleepwear'),
  ('Pure Silk Chiffon',        'Chiffon',   'Maharashtra Silk Works',  120.00, 950.00, 'Dusty Rose',     'Sheer lightweight fabric with beautiful drape for evening gowns'),
  ('Georgette Double Crepe',   'Georgette', 'Maharashtra Silk Works',   95.00, 780.00, 'Navy Blue',      'Crinkled texture georgette for sarees, dupattas and formal wear'),
  ('Velvet Plush',             'Velvet',    'Rajasthan Textile Mill',   60.00, 890.00, 'Royal Burgundy', 'Dense pile velvet suited for upholstery, curtains and formal dresses'),
  ('Sultan Satin Weave',       'Satin',     'Maharashtra Silk Works',  140.00, 680.00, 'Midnight Black', 'Smooth satin with high-luster finish for bridal and evening wear'),
  ('Handloom Khadi',           'Khadi',     'Rajasthan Textile Mill',  300.00, 520.00, 'Off White',      'Hand-spun khadi for kurtas, shirts and traditional Indian garments'),
  ('Merino Wool Suiting',      'Wool',      'Gujarat Cotton House',     75.00,1450.00, 'Charcoal Grey',  'Fine Merino wool for premium suiting, blazers and overcoats'),
  ('Silk Crepe de Chine',      'Crepe',     'Maharashtra Silk Works',  110.00, 860.00, 'Coral',          'Elegant crepe with matte finish for blouses and flowy dresses'),
  ('Silk Organza',             'Organza',   'Maharashtra Silk Works',   90.00, 720.00, 'Gold',           'Crisp sheer organza for bridal overlays and couture garments'),
  ('Cotton Twill Drill',       'Twill',     'Gujarat Cotton House',    450.00, 240.00, 'Khaki',          'Durable twill-weave cotton for workwear, chinos and casual trousers')
) AS s(fabric_name, fabric_type, mill_name, available_length, price_per_meter, color, fabric_description)
WHERE NOT EXISTS (
  SELECT 1 FROM fabrics f
  WHERE f.fabric_name = s.fabric_name AND f.fabric_type = s.fabric_type
);
