/*
  RK Textiles — Checkout RPC

  Root cause: the fabrics UPDATE RLS policy only allows admins. When a customer
  places an order, Supabase returns a 403 when the checkout code tries to
  decrement available_length, so every order fails.

  Fix: a single SECURITY DEFINER function that atomically
    1. Finds the fabric (tries both `id` and `fabric_id` columns)
    2. Validates stock
    3. Decrements available_length / flips availability_status
    4. Inserts the row into orders
    5. Returns the new order_id as JSON

  Because it runs as the function owner (SECURITY DEFINER), it bypasses
  per-row RLS policies on fabrics and orders, while still enforcing the
  business rule that the caller must be a logged-in Supabase user.
*/

-- Ensure orders table has the required checkout columns before creating RPC.
-- This prevents errors like: "column fabric_id does not exist".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fabric_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fabric_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS length_ordered numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE orders ALTER COLUMN order_status SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_fabric_id ON orders(fabric_id);

CREATE OR REPLACE FUNCTION checkout_place_order(
  p_user_id       uuid,
  p_customer_name text,
  p_mobile        text,
  p_address       text,
  p_email         text,
  p_fabric_id     text,       -- passed as text from JS (could be id or fabric_id)
  p_fabric_name   text,
  p_length_ordered   numeric,
  p_price_per_meter  numeric,
  p_total_price      numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_try_id    uuid;
  v_fabric    fabrics%ROWTYPE;
  v_new_len   numeric;
  v_order_id  uuid;
BEGIN
  -- ── 1. Must be called by an authenticated Supabase user ──────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── 2. Validate inputs ────────────────────────────────────────────────────
  IF p_length_ordered <= 0 THEN
    RAISE EXCEPTION 'Length must be greater than 0';
  END IF;

  IF p_total_price < 0 THEN
    RAISE EXCEPTION 'Total price cannot be negative';
  END IF;

  -- ── 3. Resolve fabric row ─────────────────────────────────────────────────
  -- Try to parse the supplied string as a UUID. If it is not valid we skip the
  -- UUID-based lookups and fall through to the name fallback.
  BEGIN
    v_try_id := p_fabric_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_try_id := NULL;
  END;

  -- Try primary-key column first (fabric_id), then the alternate id column.
  IF v_try_id IS NOT NULL THEN
    SELECT * INTO v_fabric FROM fabrics WHERE fabric_id = v_try_id LIMIT 1;
    IF NOT FOUND THEN
      -- Attempt the `id` alias column (added by migration 202603160600)
      BEGIN
        SELECT * INTO v_fabric FROM fabrics WHERE id = v_try_id LIMIT 1;
      EXCEPTION WHEN undefined_column THEN
        NULL; -- `id` column doesn't exist yet, ignore
      END;
    END IF;
  END IF;

  -- Final fallback: look up by fabric_name (catches edge-cases)
  IF v_fabric IS NULL OR v_fabric.fabric_id IS NULL THEN
    SELECT * INTO v_fabric FROM fabrics
    WHERE lower(fabric_name) = lower(p_fabric_name)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_fabric IS NULL OR v_fabric.fabric_id IS NULL THEN
    RAISE EXCEPTION 'Fabric "%" not found in catalog', p_fabric_name;
  END IF;

  -- ── 4. Stock check ────────────────────────────────────────────────────────
  v_new_len := COALESCE(v_fabric.available_length, 0) - p_length_ordered;
  IF v_new_len < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for "%". Available: % m, requested: % m',
      p_fabric_name,
      COALESCE(v_fabric.available_length, 0),
      p_length_ordered;
  END IF;

  -- ── 5. Decrement stock ────────────────────────────────────────────────────
  UPDATE fabrics
  SET
    available_length    = v_new_len,
    availability_status = CASE WHEN v_new_len > 0 THEN 'available' ELSE 'out_of_stock' END,
    availability        = (v_new_len > 0)
  WHERE fabric_id = v_fabric.fabric_id;

  -- ── 6. Insert order ───────────────────────────────────────────────────────
  INSERT INTO orders (
    user_id,
    customer_name,
    mobile,
    address,
    email,
    fabric_id,
    fabric_name,
    length_ordered,
    price_per_meter,
    total_price,
    order_status
  )
  VALUES (
    p_user_id,
    p_customer_name,
    p_mobile,
    p_address,
    p_email,
    v_fabric.fabric_id,
    p_fabric_name,
    p_length_ordered,
    p_price_per_meter,
    p_total_price,
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- ── 7. Return result ──────────────────────────────────────────────────────
  RETURN json_build_object(
    'success',   true,
    'order_id',  v_order_id,
    'fabric_id', v_fabric.fabric_id,
    'remaining_length', v_new_len
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context so the JS caller gets a readable message
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION checkout_place_order TO authenticated;
