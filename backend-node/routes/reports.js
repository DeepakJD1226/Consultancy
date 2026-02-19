// Reports Routes
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/reports/dashboard - Dashboard summary
router.get('/dashboard', (req, res) => {
    try {
        const customers = store.findAll('customers');
        const orders = store.findAll('orders');
        const inventory = store.findAll('inventory');
        const bills = store.findAll('bills');

        // Customer stats
        const customerStats = {
            total: customers.length,
        };

        // Order stats
        const pendingOrders = orders.filter(o => o.status === 'Pending').length;
        const orderStats = {
            total: orders.length,
            pending: pendingOrders,
            completed: orders.filter(o => o.status === 'Completed').length,
        };

        // Revenue stats
        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const pendingPayments = bills
            .filter(b => b.payment_status === 'Pending')
            .reduce((sum, b) => sum + parseFloat(b.grand_total || b.total_amount || 0), 0);
        const revenueStats = {
            total: totalRevenue,
            pending_payments: pendingPayments,
        };

        // Inventory stats
        const totalValue = inventory.reduce(
            (sum, i) => sum + parseFloat(i.quantity_meters) * parseFloat(i.rate_per_meter), 0
        );
        const lowStockItems = inventory.filter(i => parseFloat(i.quantity_meters) < 50).length;
        const inventoryStats = {
            total_value: totalValue,
            low_stock_items: lowStockItems,
        };

        // Recent orders (last 5, with customer info)
        const recentOrders = orders
            .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
            .slice(0, 5)
            .map(order => {
                const customer = store.findById('customers', order.customer_id);
                return {
                    ...order,
                    customer_name: customer ? customer.name : 'Unknown',
                    customer_phone: customer ? customer.phone : 'N/A',
                };
            });

        res.json({
            success: true,
            data: {
                customers: customerStats,
                orders: orderStats,
                revenue: revenueStats,
                inventory: inventoryStats,
                recent_orders: recentOrders,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/reports/sales - Sales report
router.get('/sales', (req, res) => {
    try {
        let orders = store.findAll('orders');

        // Filter by date range
        if (req.query.from_date) {
            orders = orders.filter(o => new Date(o.order_date) >= new Date(req.query.from_date));
        }
        if (req.query.to_date) {
            orders = orders.filter(o => new Date(o.order_date) <= new Date(req.query.to_date));
        }

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Group by fabric type
        const fabricMap = {};
        orders.forEach(order => {
            const key = order.fabric_type;
            if (!fabricMap[key]) {
                fabricMap[key] = { fabric_type: key, orders: 0, quantity_meters: 0, revenue: 0 };
            }
            fabricMap[key].orders += 1;
            fabricMap[key].quantity_meters += parseFloat(order.quantity_meters || 0);
            fabricMap[key].revenue += parseFloat(order.total_amount || 0);
        });

        res.json({
            success: true,
            data: {
                summary: {
                    total_orders: totalOrders,
                    total_revenue: totalRevenue,
                    average_order_value: averageOrderValue,
                },
                fabric_breakdown: Object.values(fabricMap),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/reports/inventory - Inventory report
router.get('/inventory', (req, res) => {
    try {
        const inventory = store.findAll('inventory');

        const totalItems = inventory.length;
        const totalMeters = inventory.reduce((sum, i) => sum + parseFloat(i.quantity_meters), 0);
        const totalValue = inventory.reduce(
            (sum, i) => sum + parseFloat(i.quantity_meters) * parseFloat(i.rate_per_meter), 0
        );

        const inStock = inventory.filter(i => parseFloat(i.quantity_meters) >= 50).length;
        const lowStock = inventory.filter(
            i => parseFloat(i.quantity_meters) >= 10 && parseFloat(i.quantity_meters) < 50
        ).length;
        const outOfStock = inventory.filter(i => parseFloat(i.quantity_meters) < 10).length;

        res.json({
            success: true,
            data: {
                summary: {
                    total_items: totalItems,
                    total_meters: totalMeters,
                    total_value: totalValue,
                },
                stock_levels: {
                    in_stock: inStock,
                    low_stock: lowStock,
                    out_of_stock: outOfStock,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/reports/customers - Customer report
router.get('/customers', (req, res) => {
    try {
        const customers = store.findAll('customers');
        const orders = store.findAll('orders');

        const topCustomers = customers.map(customer => {
            const customerOrders = orders.filter(o => o.customer_id === customer.id);
            const totalOrders = customerOrders.length;
            const totalSpent = customerOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

            return {
                name: customer.name,
                phone: customer.phone,
                business_type: customer.business_type,
                total_orders: totalOrders,
                total_spent: totalSpent,
            };
        }).sort((a, b) => b.total_spent - a.total_spent);

        res.json({
            success: true,
            data: {
                total_customers: customers.length,
                top_customers: topCustomers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
