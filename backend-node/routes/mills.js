// Mills Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/mills - List all mills
router.get('/', (req, res) => {
    try {
        const mills = store.findAll('mills');
        res.json({ success: true, data: mills });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/mills/raw-materials - List raw materials
router.get('/raw-materials', (req, res) => {
    try {
        let rawMaterials = store.findAll('rawMaterials');

        // Filter by mill_id
        if (req.query.mill_id) {
            rawMaterials = rawMaterials.filter(rm => rm.mill_id === req.query.mill_id);
        }

        // Filter by status
        if (req.query.status) {
            rawMaterials = rawMaterials.filter(rm => rm.status === req.query.status);
        }

        // Attach mill info (frontend expects rm.mills.mill_name)
        const enriched = rawMaterials.map(rm => {
            const mill = store.findById('mills', rm.mill_id);
            return {
                ...rm,
                mills: mill ? { mill_name: mill.mill_name } : null,
            };
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/mills/performance - Mill performance stats
router.get('/performance', (req, res) => {
    try {
        const mills = store.findAll('mills');
        const rawMaterials = store.findAll('rawMaterials');

        const performance = mills.map(mill => {
            const millRM = rawMaterials.filter(rm => rm.mill_id === mill.id);

            const total_raw_material_kg = millRM.reduce((sum, rm) => sum + parseFloat(rm.quantity_kg || 0), 0);
            const total_fabric_received_meters = millRM.reduce(
                (sum, rm) => sum + parseFloat(rm.fabric_received_meters || 0), 0
            );
            const pending_production_count = millRM.filter(rm => rm.status !== 'Completed').length;
            const completed_count = millRM.filter(rm => rm.status === 'Completed').length;

            return {
                mill_name: mill.mill_name,
                total_raw_material_kg,
                total_fabric_received_meters,
                pending_production_count,
                completed_count,
            };
        });

        res.json({ success: true, data: performance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/mills/:id - Get mill by ID
router.get('/:id', (req, res) => {
    try {
        const mill = store.findById('mills', req.params.id);
        if (!mill) {
            return res.status(404).json({ success: false, error: 'Mill not found' });
        }
        res.json({ success: true, data: mill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/mills - Create mill
router.post('/', (req, res) => {
    try {
        const { mill_name, location, contact_person, phone } = req.body;

        if (!mill_name) {
            return res.status(400).json({ success: false, error: 'mill_name is required' });
        }

        const mill = store.create('mills', {
            mill_name,
            location: location || '',
            contact_person: contact_person || '',
            phone: phone || '',
        });

        res.status(201).json({ success: true, data: mill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/mills/raw-materials - Send raw materials to mill
router.post('/raw-materials', (req, res) => {
    try {
        const { mill_id, material_type, quantity_kg } = req.body;

        if (!mill_id || !material_type || !quantity_kg) {
            return res.status(400).json({
                success: false,
                error: 'mill_id, material_type, and quantity_kg are required',
            });
        }

        const rawMaterial = store.create('rawMaterials', {
            mill_id,
            material_type,
            quantity_kg: parseFloat(quantity_kg),
            sent_date: new Date().toISOString(),
            status: 'Sent',
            fabric_received_meters: null,
        });

        res.status(201).json({ success: true, data: rawMaterial });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/mills/raw-materials/:id - Update raw material status
router.put('/raw-materials/:id', (req, res) => {
    try {
        const updated = store.update('rawMaterials', req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Raw material entry not found' });
        }
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
