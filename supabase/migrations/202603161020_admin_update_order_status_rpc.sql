/*
  Admin order status update RPC

  Fixes cases where direct UPDATE on orders/fabric_orders is blocked by RLS
  for admin UI actions. Uses SECURITY DEFINER with admin guard.
*/

CREATE OR REPLACE FUNCTION admin_update_order_status(
  p_order_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_admin_marketplace() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', p_status;
  END IF;

  UPDATE orders
  SET order_status = p_status
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 AND to_regclass('public.fabric_orders') IS NOT NULL THEN
    UPDATE fabric_orders
    SET order_status = p_status
    WHERE order_id = p_order_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'success', (v_updated > 0),
    'updated_rows', v_updated,
    'order_id', p_order_id,
    'order_status', p_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_order_status(uuid, text) TO authenticated;
