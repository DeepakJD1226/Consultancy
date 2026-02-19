// Inventory Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/inventory - List all inventory items
router.get('/', (req, res) => {
    try {
        let inventory = store.findAll('inventory');

        // Filter by fabric_type
        if (req.query.fabric_type) {
            inventory = inventory.filter(i => i.fabric_type === req.query.fabric_type);
        }

        // Filter low stock (quantity < 50)
        if (req.query.low_stock === 'true') {
            inventory = inventory.filter(i => parseFloat(i.quantity_meters) < 50);
        }

        res.json({ success: true, data: inventory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/inventory/low-stock - Get low stock items
router.get('/low-stock', (req, res) => {
    try {
        const lowStock = store.findAll('inventory').filter(i => parseFloat(i.quantity_meters) < 50);
        res.json({ success: true, data: lowStock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/inventory/summary - Get inventory summary
router.get('/summary', (req, res) => {
    try {
        const inventory = store.findAll('inventory');
        const totalItems = inventory.length;
        const totalMeters = inventory.reduce((sum, i) => sum + parseFloat(i.quantity_meters), 0);
        const totalValue = inventory.reduce(
            (sum, i) => sum + parseFloat(i.quantity_meters) * parseFloat(i.rate_per_meter), 0
        );

        res.json({
            success: true,
            data: {
                total_items: totalItems,
                total_meters: totalMeters,
                total_value: totalValue,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/inventory/:id - Get item by ID
router.get('/:id', (req, res) => {
    try {
        const item = store.findById('inventory', req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/inventory - Add inventory item
router.post('/', (req, res) => {
    try {
        const { fabric_type, fabric_color, quantity_meters, rate_per_meter, location } = req.body;

        if (!fabric_type || !fabric_color || !quantity_meters || !rate_per_meter) {
            return res.status(400).json({
                success: false,
                error: 'fabric_type, fabric_color, quantity_meters, and rate_per_meter are required',
            });
        }

        const item = store.create('inventory', {
            fabric_type,
            fabric_color,
            quantity_meters: parseFloat(quantity_meters),
            rate_per_meter: parseFloat(rate_per_meter),
            location: location || '',
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.quantity_meters) updates.quantity_meters = parseFloat(updates.quantity_meters);
        if (updates.rate_per_meter) updates.rate_per_meter = parseFloat(updates.rate_per_meter);

        const updated = store.update('inventory', req.params.id, updates);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', (req, res) => {
    try {
        const deleted = store.remove('inventory', req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }
        res.json({ success: true, message: 'Inventory item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
