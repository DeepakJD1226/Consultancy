// Customers Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/customers - List all customers
router.get('/', (req, res) => {
    try {
        let customers = store.findAll('customers');

        // Filter by search (name or phone)
        if (req.query.search) {
            const search = req.query.search.toLowerCase();
            customers = customers.filter(
                c => c.name.toLowerCase().includes(search) || c.phone.includes(search)
            );
        }

        // Filter by business type
        if (req.query.business_type) {
            customers = customers.filter(c => c.business_type === req.query.business_type);
        }

        res.json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/customers/search?phone= - Search by phone
router.get('/search', (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }

        const customer = store.findAll('customers').find(c => c.phone === phone);

        if (customer) {
            res.json({ success: true, found: true, data: { customer } });
        } else {
            res.json({ success: true, found: false, data: null });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', (req, res) => {
    try {
        const customer = store.findById('customers', req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/customers - Create customer
router.post('/', (req, res) => {
    try {
        const { name, phone, business_type, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Name and phone are required' });
        }

        // Check duplicate phone
        const existing = store.findAll('customers').find(c => c.phone === phone);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Customer with this phone already exists' });
        }

        const customer = store.create('customers', { name, phone, business_type: business_type || '', address: address || '' });
        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', (req, res) => {
    try {
        const updated = store.update('customers', req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', (req, res) => {
    try {
        const deleted = store.remove('customers', req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        res.json({ success: true, message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
