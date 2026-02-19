// R.K. Textiles - Node.js Backend Server
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// ─── Import Routes ──────────────────────────────────────────────────
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const inventoryRouter = require('./routes/inventory');
const billingRouter = require('./routes/billing');
const millsRouter = require('./routes/mills');
const reportsRouter = require('./routes/reports');

// ─── Mount Routes ───────────────────────────────────────────────────
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/bills', billingRouter);
app.use('/api/mills', millsRouter);
app.use('/api/reports', reportsRouter);

// ─── Root & Health ──────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        message: 'R.K. Textiles API Server (Node.js)',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// ─── Error Handlers ─────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start Server ───────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  R.K. Textiles Backend Server (Node.js)`);
    console.log(`${'='.repeat(50)}`);
    console.log(`  Server running on: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`${'='.repeat(50)}\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠ Port ${PORT} is in use, trying port ${Number(PORT) + 1}...`);
        app.listen(Number(PORT) + 1, () => {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`  R.K. Textiles Backend Server (Node.js)`);
            console.log(`${'='.repeat(50)}`);
            console.log(`  Server running on: http://localhost:${Number(PORT) + 1}`);
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`${'='.repeat(50)}\n`);
        });
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});
