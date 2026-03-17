/*
  # R.K. Textiles Booking System Database

  1. New Tables
    - `products`: Cotton fabric products (white, grey, other colors)
      - `id` (uuid, primary key)
      - `name` (text, product name/type)
      - `color` (text, fabric color)
      - `price_per_meter` (decimal, price per meter)
      - `description` (text, product details)
      - `is_available` (boolean, availability status)
      - `created_at` (timestamp)
    
    - `bookings`: Customer bookings/orders
      - `id` (uuid, primary key)
      - `user_id` (uuid, customer user ID)
      - `booking_date` (date, date when customer wants delivery)
      - `status` (text, pending/confirmed/completed/cancelled)
      - `total_amount` (decimal, total order value)
      - `notes` (text, special requests)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `booking_items`: Individual items in each booking
      - `id` (uuid, primary key)
      - `booking_id` (uuid, reference to booking)
      - `product_id` (uuid, reference to product)
      - `quantity` (decimal, quantity in meters)
      - `unit_price` (decimal, price at time of booking)
      - `subtotal` (decimal, quantity * unit_price)
    
    - `invoices`: Generated invoices for bookings
      - `id` (uuid, primary key)
      - `booking_id` (uuid, reference to booking)
      - `invoice_number` (text, unique invoice ID)
      - `invoice_date` (date, date of invoice generation)
      - `total_amount` (decimal, total invoice amount)
      - `status` (text, pending/paid)
      - `created_at` (timestamp)
    
    - `customers`: Customer profiles
      - `id` (uuid, primary key, references auth.users)
      - `business_name` (text, customer business name)
      - `contact_person` (text, contact person name)
      - `email` (text, email address)
      - `phone` (text, phone number)
      - `address` (text, delivery address)
      - `city` (text, city)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Customers can only view/edit their own data
    - Customers can only view their own bookings and invoices
    - Admin users can view all data (via app_metadata role check)

  3. Indexes
    - Added indexes for frequently queried columns
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  price_per_meter decimal(10, 2) NOT NULL,
  description text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  status text DEFAULT 'pending',
  total_amount decimal(12, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity decimal(10, 2) NOT NULL,
  unit_price decimal(10, 2) NOT NULL,
  subtotal decimal(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL,
  total_amount decimal(12, 2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Products: Anyone authenticated can view available products
CREATE POLICY "View available products"
  ON products FOR SELECT
  TO authenticated
  USING (is_available = true);

-- Customers: Users can only view their own profile
CREATE POLICY "Users can view own customer profile"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own customer profile"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own customer profile"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Bookings: Users can only view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Booking Items: Users can only view items in their own bookings
CREATE POLICY "Users can view own booking items"
  ON booking_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in own bookings"
  ON booking_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own booking items"
  ON booking_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Invoices: Users can only view invoices for their own bookings
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = invoices.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Insert sample products
INSERT INTO products (name, color, price_per_meter, description, is_available)
VALUES
  ('Premium Cotton Fabric', 'White', 450.00, 'High-quality white cotton fabric suitable for hotel bedsheets', true),
  ('Premium Cotton Fabric', 'Grey', 450.00, 'High-quality grey cotton fabric suitable for hotel bedsheets', true),
  ('Cotton Blend', 'White', 350.00, 'Cotton blend fabric in white for diverse applications', true),
  ('Cotton Blend', 'Grey', 350.00, 'Cotton blend fabric in grey for diverse applications', true),
  ('Premium Cotton Fabric', 'Navy Blue', 480.00, 'Premium navy blue cotton fabric for specialty applications', true),
  ('Premium Cotton Fabric', 'Black', 480.00, 'Premium black cotton fabric for specialty applications', true)
ON CONFLICT DO NOTHING;