/*
  Complete order pipeline schema guard

  Guarantees `orders` table exists with all required columns used by checkout,
  my-orders, admin orders dashboard, and confirmation flow.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  mobile text,
  email text,
  address text,
  fabric_id uuid,
  fabric_name text,
  length_ordered numeric,
  price_per_meter numeric,
  total_price numeric,
  order_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fabric_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fabric_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS length_ordered numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_per_meter numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE orders ALTER COLUMN order_status SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_fabric_id ON orders(fabric_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_insert_authenticated ON orders;
DROP POLICY IF EXISTS orders_select_own ON orders;
DROP POLICY IF EXISTS orders_select_admin ON orders;
DROP POLICY IF EXISTS orders_update_admin ON orders;

CREATE POLICY orders_insert_authenticated
  ON orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

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
