/*
  Fix checkout flow — the previous RPC migration was missing two columns
  in the ALTER TABLE list (email + price_per_meter).  The RPC INSERT fails
  at runtime because those columns don't exist in orders.

  Also recreating checkout_place_order with a more defensive UPDATE block
  so it doesn't fail when availability / availability_status are absent from
  some installs.
*/

-- ── 1. Add the missing columns to orders ────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email           text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_per_meter numeric(10, 2);

-- ── 2. Recreate checkout_place_order with the corrected INSERT ───────────────
CREATE OR REPLACE FUNCTION checkout_place_order(
  p_user_id          uuid,
  p_customer_name    text,
  p_mobile           text,
  p_address          text,
  p_email            text,
  p_fabric_id        text,
  p_fabric_name      text,
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
  -- ── 1. Must be authenticated ─────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── 2. Validate inputs ───────────────────────────────────────────────────
  IF p_length_ordered <= 0 THEN
    RAISE EXCEPTION 'Length must be greater than 0';
  END IF;
  IF p_total_price < 0 THEN
    RAISE EXCEPTION 'Total price cannot be negative';
  END IF;

  -- ── 3. Resolve fabric row ────────────────────────────────────────────────
  BEGIN
    v_try_id := p_fabric_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_try_id := NULL;
  END;

  IF v_try_id IS NOT NULL THEN
    -- Primary key lookup first
    SELECT * INTO v_fabric FROM fabrics WHERE fabric_id = v_try_id LIMIT 1;
    IF NOT FOUND THEN
      BEGIN
        SELECT * INTO v_fabric FROM fabrics WHERE id = v_try_id LIMIT 1;
      EXCEPTION WHEN undefined_column THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Name fallback
  IF v_fabric IS NULL OR v_fabric.fabric_id IS NULL THEN
    SELECT * INTO v_fabric FROM fabrics
    WHERE lower(fabric_name) = lower(p_fabric_name)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_fabric IS NULL OR v_fabric.fabric_id IS NULL THEN
    RAISE EXCEPTION 'Fabric "%" not found in catalog', p_fabric_name;
  END IF;

  -- ── 4. Stock check ───────────────────────────────────────────────────────
  v_new_len := COALESCE(v_fabric.available_length, 0) - p_length_ordered;
  IF v_new_len < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for "%". Available: % m, requested: % m',
      p_fabric_name,
      COALESCE(v_fabric.available_length, 0),
      p_length_ordered;
  END IF;

  -- ── 5. Decrement stock ───────────────────────────────────────────────────
  -- Always update available_length (it exists in all schema versions)
  UPDATE fabrics
  SET available_length = v_new_len
  WHERE fabric_id = v_fabric.fabric_id;

  -- Update availability_status / availability conditionally
  BEGIN
    UPDATE fabrics
    SET
      availability_status = CASE WHEN v_new_len > 0 THEN 'available' ELSE 'out_of_stock' END,
      availability        = (v_new_len > 0)
    WHERE fabric_id = v_fabric.fabric_id;
  EXCEPTION WHEN undefined_column THEN
    -- These columns may not exist in all installs; safe to skip
    NULL;
  END;

  -- ── 6. Insert order ──────────────────────────────────────────────────────
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

  -- ── 7. Return result ─────────────────────────────────────────────────────
  RETURN json_build_object(
    'success',          true,
    'order_id',         v_order_id,
    'fabric_id',        v_fabric.fabric_id,
    'remaining_length', v_new_len
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION checkout_place_order TO authenticated;
