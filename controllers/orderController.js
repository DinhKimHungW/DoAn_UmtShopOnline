const Order = require('../models/order');
const Cart = require('../models/cart');

exports.getCheckout = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const cart = await Cart.getByUserId(req.session.user.id);
    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return res.redirect('/cart');
    }
    
    // Calculate total
    const total = cart.cart_items.reduce((sum, item) => sum + (item.qty * item.products.price), 0);

    res.render('checkout', { 
      title: 'Checkout', 
      cart, 
      total,
      user: req.session.user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.postCheckout = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const { address, paymentMethod } = req.body;
  
  try {
    const cart = await Cart.getByUserId(req.session.user.id);
    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = cart.cart_items.reduce((sum, item) => sum + (item.qty * item.products.price), 0);

    const orderData = {
      user_id: req.session.user.id,
      total_amount: total,
      address,
      payment_method: paymentMethod,
      status: 'pending'
    };

    const items = cart.cart_items.map(item => ({
      product_id: item.product_id,
      qty: item.qty,
      price: item.products.price
    }));

    await Order.create(orderData, items);

    // Clear cart after successful order
    await Cart.clearCart(req.session.user.id);
    
    res.json({ success: true, redirectUrl: '/orders' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getOrders = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const orders = await Order.getByUserId(req.session.user.id);
    res.render('orders', { title: 'My Orders', orders, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.getOrderDetail = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const orderId = req.params.id;
    const order = await Order.getById(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Ensure the order belongs to the logged-in user or the user is an admin
    const roleName = req.session.user?.roles?.name || req.session.user?.role;
    const isAdmin = ['admin_canteen', 'super_admin', 'admin', 'superadmin'].includes(roleName);

    if (order.user_id !== req.session.user.id && !isAdmin) {
      return res.status(403).send('Unauthorized');
    }

    res.render('order_detail', { title: 'Order Detail', order, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
