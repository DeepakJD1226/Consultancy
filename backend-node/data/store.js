// In-memory data store for R.K. Textiles
// This replaces the database temporarily - data resets on server restart

const { v4: uuidv4 } = require('uuid');

// ─── Data Collections ───────────────────────────────────────────────
const data = {
    customers: [],
    orders: [],
    inventory: [],
    bills: [],
    mills: [],
    rawMaterials: [],
};

// ─── Helper Functions ───────────────────────────────────────────────

function generateId() {
    return uuidv4();
}

function now() {
    return new Date().toISOString();
}

// Generic CRUD helpers
function findAll(collection) {
    return data[collection] || [];
}

function findById(collection, id) {
    return (data[collection] || []).find(item => item.id === id) || null;
}

function create(collection, item) {
    const newItem = {
        id: generateId(),
        ...item,
        created_at: now(),
        updated_at: now(),
    };
    data[collection].push(newItem);
    return newItem;
}

function update(collection, id, updates) {
    const index = data[collection].findIndex(item => item.id === id);
    if (index === -1) return null;

    data[collection][index] = {
        ...data[collection][index],
        ...updates,
        updated_at: now(),
    };
    return data[collection][index];
}

function remove(collection, id) {
    const index = data[collection].findIndex(item => item.id === id);
    if (index === -1) return false;

    data[collection].splice(index, 1);
    return true;
}

function filter(collection, predicate) {
    return (data[collection] || []).filter(predicate);
}

// ─── Seed some sample data so the dashboard isn't empty ─────────────

function seedData() {
    // Sample Customers
    const cust1 = create('customers', {
        name: 'Hotel Grand Palace',
        phone: '9876543210',
        business_type: 'Hotel',
        address: '123 Main Road, Erode',
    });
    const cust2 = create('customers', {
        name: 'Sri Textiles',
        phone: '9876543211',
        business_type: 'Retailer',
        address: '45 Market Street, Salem',
    });
    const cust3 = create('customers', {
        name: 'Krishna Wholesale',
        phone: '9876543212',
        business_type: 'Wholesaler',
        address: '78 Industrial Area, Coimbatore',
    });

    // Sample Inventory
    const inv1 = create('inventory', {
        fabric_type: 'Cotton Bedsheet',
        fabric_color: 'White',
        quantity_meters: 500,
        rate_per_meter: 120,
        location: 'Warehouse A',
    });
    const inv2 = create('inventory', {
        fabric_type: 'Polyester Blend',
        fabric_color: 'Blue',
        quantity_meters: 30,
        rate_per_meter: 85,
        location: 'Warehouse A',
    });
    const inv3 = create('inventory', {
        fabric_type: 'Silk Cotton',
        fabric_color: 'Cream',
        quantity_meters: 8,
        rate_per_meter: 250,
        location: 'Warehouse B',
    });

    // Sample Orders
    const order1 = create('orders', {
        customer_id: cust1.id,
        fabric_type: 'Cotton Bedsheet',
        quantity_meters: 100,
        rate_per_meter: 120,
        total_amount: 12000,
        status: 'Completed',
        order_date: new Date(Date.now() - 5 * 86400000).toISOString(),
        notes: 'Urgent delivery',
    });
    const order2 = create('orders', {
        customer_id: cust2.id,
        fabric_type: 'Polyester Blend',
        quantity_meters: 50,
        rate_per_meter: 85,
        total_amount: 4250,
        status: 'Pending',
        order_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        notes: '',
    });

    // Sample Bills
    create('bills', {
        bill_number: 'BILL-001',
        customer_id: cust1.id,
        order_id: order1.id,
        bill_date: order1.order_date,
        total_amount: 12000,
        tax_amount: 2160,
        grand_total: 14160,
        payment_status: 'Paid',
    });
    create('bills', {
        bill_number: 'BILL-002',
        customer_id: cust2.id,
        order_id: order2.id,
        bill_date: order2.order_date,
        total_amount: 4250,
        tax_amount: 765,
        grand_total: 5015,
        payment_status: 'Pending',
    });

    // Sample Mills
    const mill1 = create('mills', {
        mill_name: 'Lakshmi Weaving Mill',
        location: 'Erode',
        contact_person: 'Rajesh Kumar',
        phone: '9876500001',
    });
    const mill2 = create('mills', {
        mill_name: 'Sakthi Textiles Mill',
        location: 'Salem',
        contact_person: 'Ganesh Babu',
        phone: '9876500002',
    });

    // Sample Raw Materials
    create('rawMaterials', {
        mill_id: mill1.id,
        material_type: 'Raw Cotton',
        quantity_kg: 500,
        sent_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        status: 'Completed',
        fabric_received_meters: 450,
    });
    create('rawMaterials', {
        mill_id: mill2.id,
        material_type: 'Polyester Yarn',
        quantity_kg: 200,
        sent_date: new Date(Date.now() - 3 * 86400000).toISOString(),
        status: 'In Production',
        fabric_received_meters: null,
    });
}

// Seed on module load
seedData();

module.exports = {
    data,
    generateId,
    now,
    findAll,
    findById,
    create,
    update,
    remove,
    filter,
};
