-- Supabase Database Setup for R.K. Textiles
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: Customers
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    business_type VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster phone searches
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- TABLE 2: Inventory
-- ============================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fabric_type VARCHAR(100) NOT NULL,
    fabric_color VARCHAR(50) NOT NULL,
    quantity_meters DECIMAL(10,2) NOT NULL CHECK (quantity_meters >= 0),
    rate_per_meter DECIMAL(10,2) NOT NULL,
    location VARCHAR(100),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fabric_type, fabric_color)
);

-- Create index for low stock queries
CREATE INDEX idx_inventory_quantity ON inventory(quantity_meters);

-- ============================================
-- TABLE 3: Mills
-- ============================================
CREATE TABLE mills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mill_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    contact_person VARCHAR(100),
    phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 4: Orders
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fabric_type VARCHAR(100) NOT NULL,
    quantity_meters DECIMAL(10,2) NOT NULL,
    rate_per_meter DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================
-- TABLE 5: Bills
-- ============================================
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    bill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subtotal DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid')),
    pdf_url TEXT
);

-- Create indexes
CREATE INDEX idx_bills_customer ON bills(customer_id);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_date ON bills(bill_date);

-- ============================================
-- TABLE 6: Raw Materials
-- ============================================
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mill_id UUID NOT NULL REFERENCES mills(id) ON DELETE CASCADE,
    material_type VARCHAR(100) NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    sent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'In Production' CHECK (status IN ('In Production', 'Completed')),
    fabric_received_meters DECIMAL(10,2),
    received_date TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_raw_materials_mill ON raw_materials(mill_id);
CREATE INDEX idx_raw_materials_status ON raw_materials(status);

-- ============================================
-- Insert Sample Data
-- ============================================

-- Sample Mills
INSERT INTO mills (mill_name, location, contact_person, phone) VALUES
('Sunrise Cotton Mill', 'Coimbatore', 'Ravi Kumar', '9876543210'),
('Modern Textiles Mill', 'Tirupur', 'Suresh Babu', '9876543211');

-- Sample Customers
INSERT INTO customers (name, phone, business_type, address) VALUES
('Grand Hotel', '9123456789', 'Hotel', '123 Main Street, City Center'),
('Royal Inn', '9123456790', 'Hotel', '456 Park Avenue, Downtown'),
('Textile Retailers Ltd', '9123456791', 'Retailer', '789 Market Road, Business District');

-- Sample Inventory
INSERT INTO inventory (fabric_type, fabric_color, quantity_meters, rate_per_meter, location) VALUES
('Cotton Bedsheet Fabric', 'White', 500.00, 120.00, 'Warehouse A'),
('Cotton Bedsheet Fabric', 'Grey', 300.00, 115.00, 'Warehouse A'),
('Premium Cotton Fabric', 'White', 150.00, 180.00, 'Warehouse B'),
('Cotton Fabric', 'Blue', 80.00, 125.00, 'Warehouse A'),
('Cotton Fabric', 'Cream', 45.00, 122.00, 'Warehouse A');

-- Sample Orders (will be created through the application)
-- Sample Bills (will be generated through the application)

-- ============================================
-- Useful Queries for Testing
-- ============================================

-- View all customers with their order count
-- SELECT c.*, COUNT(o.id) as order_count 
-- FROM customers c 
-- LEFT JOIN orders o ON c.id = o.customer_id 
-- GROUP BY c.id;

-- View low stock items (< 50 meters)
-- SELECT * FROM inventory WHERE quantity_meters < 50 ORDER BY quantity_meters ASC;

-- View pending orders
-- SELECT o.*, c.name as customer_name, c.phone 
-- FROM orders o 
-- JOIN customers c ON o.customer_id = c.id 
-- WHERE o.status = 'Pending'
-- ORDER BY o.order_date DESC;

-- View unpaid bills
-- SELECT b.*, c.name as customer_name 
-- FROM bills b 
-- JOIN customers c ON b.customer_id = c.id 
-- WHERE b.payment_status = 'Pending'
-- ORDER BY b.bill_date DESC;

-- Mill performance
-- SELECT m.mill_name, 
--        COUNT(rm.id) as total_batches,
--        SUM(rm.quantity_kg) as total_raw_material_kg,
--        SUM(CASE WHEN rm.status = 'Completed' THEN rm.fabric_received_meters ELSE 0 END) as total_fabric_received
-- FROM mills m
-- LEFT JOIN raw_materials rm ON m.id = rm.mill_id
-- GROUP BY m.id, m.mill_name;

COMMENT ON TABLE customers IS 'Stores customer information for R.K. Textiles';
COMMENT ON TABLE inventory IS 'Tracks fabric stock levels';
COMMENT ON TABLE orders IS 'Phone-based customer orders';
COMMENT ON TABLE bills IS 'Generated bills and invoices';
COMMENT ON TABLE mills IS 'External mills for fabric production';
COMMENT ON TABLE raw_materials IS 'Tracks raw materials sent to mills and fabric received';
