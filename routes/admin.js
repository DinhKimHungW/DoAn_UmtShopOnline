const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuth, ensureRole } = require('../middlewares/auth');

// Middleware to ensure user is admin or super_admin
const requireAdmin = ensureRole(['admin_canteen', 'super_admin']);
const requireSuperAdmin = ensureRole(['super_admin']);

router.use(ensureAuth);
router.use(requireAdmin);

// Dashboard
router.get('/', adminController.getDashboard);

// Products
router.get('/products', adminController.getProducts);
router.get('/products/add', adminController.getAddProduct);
router.post('/products/add', adminController.postAddProduct);
router.get('/products/edit/:id', adminController.getEditProduct);
router.post('/products/edit/:id', adminController.postEditProduct);
router.post('/products/delete/:id', adminController.deleteProduct);

// Orders
router.get('/orders', adminController.getOrders);
router.post('/orders/status/:id', adminController.updateOrderStatus);
router.get('/orders/:id', adminController.getOrderDetail);

// Categories
router.post('/categories', adminController.postAddCategory);

// Reports
router.get('/reports/daily-revenue', adminController.getDailyRevenueReport);
router.get('/reports/super-admin', requireSuperAdmin, adminController.getSuperAdminReport);

// Users (Super Admin only)
router.get('/users', requireSuperAdmin, adminController.getUsers);
router.post('/users/role/:id', requireSuperAdmin, adminController.updateUserRole);
router.delete('/users/:id', requireSuperAdmin, adminController.deleteUser);

module.exports = router;
