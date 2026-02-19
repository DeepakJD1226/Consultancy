// Billing Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/bills - List all bills
router.get('/', (req, res) => {
    try {
        let bills = store.findAll('bills');

        // Filter by payment_status
        if (req.query.payment_status) {
            bills = bills.filter(b => b.payment_status === req.query.payment_status);
        }

        // Filter by customer_id
        if (req.query.customer_id) {
            bills = bills.filter(b => b.customer_id === req.query.customer_id);
        }

        // Attach customer info (frontend expects bill.customers.name, bill.customers.phone)
        const enrichedBills = bills.map(bill => {
            const customer = store.findById('customers', bill.customer_id);
            return {
                ...bill,
                customers: customer ? { name: customer.name, phone: customer.phone } : null,
            };
        });

        res.json({ success: true, data: enrichedBills });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bills/summary - Billing summary
router.get('/summary', (req, res) => {
    try {
        const bills = store.findAll('bills');
        const totalBills = bills.length;
        const totalAmount = bills.reduce((sum, b) => sum + parseFloat(b.grand_total || b.total_amount), 0);
        const paidAmount = bills
            .filter(b => b.payment_status === 'Paid')
            .reduce((sum, b) => sum + parseFloat(b.grand_total || b.total_amount), 0);
        const pendingAmount = totalAmount - paidAmount;

        res.json({
            success: true,
            data: {
                total_bills: totalBills,
                total_amount: totalAmount,
                paid_amount: paidAmount,
                pending_amount: pendingAmount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bills/:id/download - Download bill (stub)
router.get('/:id/download', (req, res) => {
    try {
        const bill = store.findById('bills', req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        const customer = store.findById('customers', bill.customer_id);

        // Return bill data as JSON (PDF generation can be added later)
        res.json({
            success: true,
            message: 'Bill download - PDF generation coming soon',
            data: {
                ...bill,
                customer: customer || null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/bills/:id - Get bill by ID
router.get('/:id', (req, res) => {
    try {
        const bill = store.findById('bills', req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        const customer = store.findById('customers', bill.customer_id);
        res.json({
            success: true,
            data: {
                ...bill,
                customers: customer ? { name: customer.name, phone: customer.phone } : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/bills - Create bill
router.post('/', (req, res) => {
    try {
        const { customer_id, order_id, total_amount, tax_amount, payment_status } = req.body;

        if (!customer_id || !total_amount) {
            return res.status(400).json({ success: false, error: 'customer_id and total_amount are required' });
        }

        const billCount = store.findAll('bills').length;
        const bill = store.create('bills', {
            bill_number: `BILL-${String(billCount + 1).padStart(3, '0')}`,
            customer_id,
            order_id: order_id || null,
            bill_date: new Date().toISOString(),
            total_amount: parseFloat(total_amount),
            tax_amount: tax_amount ? parseFloat(tax_amount) : parseFloat(total_amount) * 0.18,
            grand_total: tax_amount
                ? parseFloat(total_amount) + parseFloat(tax_amount)
                : parseFloat(total_amount) * 1.18,
            payment_status: payment_status || 'Pending',
        });

        res.status(201).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/bills/:id/payment - Update payment status
router.put('/:id/payment', (req, res) => {
    try {
        const { payment_status } = req.body;
        if (!payment_status) {
            return res.status(400).json({ success: false, error: 'payment_status is required' });
        }

        const updated = store.update('bills', req.params.id, { payment_status });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
