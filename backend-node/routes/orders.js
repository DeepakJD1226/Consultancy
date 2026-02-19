// Orders Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/orders - List all orders
router.get('/', (req, res) => {
    try {
        let orders = store.findAll('orders');

        // Filter by status
        if (req.query.status) {
            orders = orders.filter(o => o.status === req.query.status);
        }

        // Filter by customer_id
        if (req.query.customer_id) {
            orders = orders.filter(o => o.customer_id === req.query.customer_id);
        }

        // Attach customer info to each order (frontend expects order.customers.name, order.customers.phone)
        const enrichedOrders = orders.map(order => {
            const customer = store.findById('customers', order.customer_id);
            return {
                ...order,
                customers: customer ? { name: customer.name, phone: customer.phone } : null,
            };
        });

        res.json({ success: true, data: enrichedOrders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/orders/check-availability - Check stock availability
router.post('/check-availability', (req, res) => {
    try {
        const { fabric_type, quantity_meters } = req.body;

        if (!fabric_type || !quantity_meters) {
            return res.status(400).json({ success: false, error: 'fabric_type and quantity_meters are required' });
        }

        const inventoryItems = store.findAll('inventory').filter(i => i.fabric_type === fabric_type);
        const totalAvailable = inventoryItems.reduce((sum, item) => sum + parseFloat(item.quantity_meters), 0);

        res.json({
            success: true,
            available: totalAvailable >= quantity_meters,
            available_quantity: totalAvailable,
            requested_quantity: quantity_meters,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res) => {
    try {
        const order = store.findById('orders', req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const customer = store.findById('customers', order.customer_id);
        res.json({
            success: true,
            data: {
                ...order,
                customers: customer ? { name: customer.name, phone: customer.phone } : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/orders - Create order
router.post('/', (req, res) => {
    try {
        const { customer_id, fabric_type, quantity_meters, rate_per_meter, notes } = req.body;

        if (!customer_id || !fabric_type || !quantity_meters || !rate_per_meter) {
            return res.status(400).json({
                success: false,
                error: 'customer_id, fabric_type, quantity_meters, and rate_per_meter are required',
            });
        }

        const total_amount = parseFloat(quantity_meters) * parseFloat(rate_per_meter);

        const order = store.create('orders', {
            customer_id,
            fabric_type,
            quantity_meters: parseFloat(quantity_meters),
            rate_per_meter: parseFloat(rate_per_meter),
            total_amount,
            status: 'Pending',
            order_date: new Date().toISOString(),
            notes: notes || '',
        });

        // Auto-generate a bill for the order
        const billCount = store.findAll('bills').length;
        store.create('bills', {
            bill_number: `BILL-${String(billCount + 1).padStart(3, '0')}`,
            customer_id,
            order_id: order.id,
            bill_date: order.order_date,
            total_amount,
            tax_amount: total_amount * 0.18,
            grand_total: total_amount * 1.18,
            payment_status: 'Pending',
        });

        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/orders/:id - Update order
router.put('/:id', (req, res) => {
    try {
        const updated = store.update('orders', req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', (req, res) => {
    try {
        const order = store.findById('orders', req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        store.update('orders', req.params.id, { status: 'Cancelled' });
        res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
