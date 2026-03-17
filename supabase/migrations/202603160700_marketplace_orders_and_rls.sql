/*
  Marketplace orders + RLS

  - Adds orders table for checkout flow
  - Grants customers insert and own-read
  - Grants admins full read/update
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  mobile text NOT NULL,
  address text NOT NULL,
  fabric_id uuid,
  fabric_name text NOT NULL,
  length_ordered numeric(10,2) NOT NULL CHECK (length_ordered > 0),
  total_price numeric(12,2) NOT NULL CHECK (total_price >= 0),
  order_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

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
