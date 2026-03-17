/*
  RK Textiles — Fix admin RLS to also recognise admin by JWT email.

  Problem: is_admin_marketplace() only checked the DB role column.
  If the admin user hadn't been promoted in the DB yet, fabric INSERT/UPDATE
  was silently rejected by RLS even though AuthContext granted the admin role
  on the React side.

  Fix: return true immediately when auth.jwt()->>'email' matches the admin
  email, so the DB NEVER blocks the admin regardless of the role column.
*/

-- ── 1. Update helper function ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin_marketplace()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  jwt_email       text;
  customer_admin  boolean := false;
  users_admin     boolean := false;
BEGIN
  -- Primary check: trust the JWT email for the hard-coded admin address.
  -- This works even before the role column has been set in the profile table.
  jwt_email := lower(coalesce((auth.jwt() ->> 'email'), ''));
  IF jwt_email = 'deepakj.23aid@kongu.edu' THEN
    RETURN true;
  END IF;

  -- Secondary check: DB role column (customers table)
  IF to_regclass('public.customers') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM customers WHERE id = auth.uid() AND role = ''admin'')'
      INTO customer_admin;
  END IF;

  -- Tertiary check: DB role column (users table, if it exists)
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''admin'')'
      INTO users_admin;
  END IF;

  RETURN customer_admin OR users_admin;
END;
$$;

-- ── 2. Ensure fabrics RLS is enabled and policies are correct ─────────────────
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies so they pick up the updated function.
DROP POLICY IF EXISTS "fabrics_public_read"        ON fabrics;
DROP POLICY IF EXISTS "fabrics_admin_insert"       ON fabrics;
DROP POLICY IF EXISTS "fabrics_admin_update"       ON fabrics;
DROP POLICY IF EXISTS "fabrics_admin_delete"       ON fabrics;
DROP POLICY IF EXISTS "fabrics public read"        ON fabrics;
DROP POLICY IF EXISTS "fabrics admin insert"       ON fabrics;
DROP POLICY IF EXISTS "fabrics admin update"       ON fabrics;
DROP POLICY IF EXISTS "fabrics admin delete"       ON fabrics;
DROP POLICY IF EXISTS "Public can read fabrics"    ON fabrics;
DROP POLICY IF EXISTS "Admins can insert fabrics"  ON fabrics;
DROP POLICY IF EXISTS "Admins can update fabrics"  ON fabrics;
DROP POLICY IF EXISTS "Admins can delete fabrics"  ON fabrics;

CREATE POLICY "fabrics_public_read"
  ON fabrics FOR SELECT
  USING (true);

CREATE POLICY "fabrics_admin_insert"
  ON fabrics FOR INSERT
  WITH CHECK (is_admin_marketplace());

CREATE POLICY "fabrics_admin_update"
  ON fabrics FOR UPDATE
  USING (is_admin_marketplace())
  WITH CHECK (is_admin_marketplace());

CREATE POLICY "fabrics_admin_delete"
  ON fabrics FOR DELETE
  USING (is_admin_marketplace());

-- ── 3. Promote admin email in profile tables (idempotent) ─────────────────────
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    UPDATE customers SET role = 'admin'
    WHERE lower(email) = 'deepakj.23aid@kongu.edu' AND role <> 'admin';
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    UPDATE users SET role = 'admin'
    WHERE lower(email) = 'deepakj.23aid@kongu.edu' AND role <> 'admin';
  END IF;
END;
$$;
