/*
  Ensure fabrics has requested marketplace columns and sync values
*/

ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS price_per_meter numeric;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS available_length numeric;
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS availability boolean DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'fabric_description'
  ) THEN
    UPDATE fabrics
    SET description = COALESCE(description, fabric_description)
    WHERE description IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'price'
  ) THEN
    UPDATE fabrics
    SET price_per_meter = COALESCE(price_per_meter, price)
    WHERE price_per_meter IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fabrics' AND column_name = 'length'
  ) THEN
    UPDATE fabrics
    SET available_length = COALESCE(available_length, length)
    WHERE available_length IS NULL;
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
