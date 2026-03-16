const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const DashboardWidget = require('../models/DashboardWidget');

// --- DASHBOARD WIDGETS ---

// GET /api/data/dashboard
// Get all widgets for logged in user
router.get('/dashboard', auth, async (req, res) => {
    try {
        const widgets = await DashboardWidget.find({ userId: req.user.id }).sort({ createdAt: 1 });
        res.json(widgets);
    } catch (err) {
        console.error('Error fetching dashboard widgets:', err);
        res.status(500).send('Server Error');
    }
});

// POST /api/data/dashboard
// Save entire dashboard configuration (overwrites existing for simplicity like localStorage did)
router.post('/dashboard', auth, async (req, res) => {
    try {
        const widgetsArray = req.body;
        
        // Remove old widgets for user
        await DashboardWidget.deleteMany({ userId: req.user.id });

        // Insert new widgets
        const newWidgets = widgetsArray.map(w => ({
            ...w,
            userId: req.user.id,
            frontendId: w.id // Store frontend's UUID id
        }));

        if (newWidgets.length > 0) {
            await DashboardWidget.insertMany(newWidgets);
        }

        res.json({ message: 'Dashboard configuration saved' });
    } catch (err) {
        console.error('Error saving dashboard:', err);
        res.status(500).send('Server Error');
    }
});

// --- CUSTOMER ORDERS ---

// GET /api/data/orders
// Get all orders for logged in user
router.get('/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        // Map to standard JSON mimicking what the frontend used
        const formattedOrders = orders.map(o => ({
            ...o._doc,
            id: o._id.toString() 
        }));
        res.json(formattedOrders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send('Server Error');
    }
});

// POST /api/data/orders
// Add a single new order
router.post('/orders', auth, async (req, res) => {
    try {
        const orderData = req.body;
        const newOrder = new Order({
            ...orderData,
            userId: req.user.id
        });
        
        const savedOrder = await newOrder.save();
        res.status(201).json({ ...savedOrder._doc, id: savedOrder._id.toString() });
    } catch (err) {
        console.error('Error saving order:', err);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/data/orders/:id
// Delete a single order by ID
router.delete('/orders/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        // Make sure user owns the order
        if (order.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await order.deleteOne();
        res.json({ message: 'Order removed' });
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).send('Server Error');
    }
});

// PUT /api/data/orders/:id
// Update an existing order
router.put('/orders/:id', auth, async (req, res) => {
    try {
        let order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        // Make sure user owns the order
        if (order.userId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        order = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json({ ...order._doc, id: order._id.toString() });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
