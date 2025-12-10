const Cart = require('../models/cart');
const Product = require('../models/product'); // Import Product model
const supabase = require('../config/supabase'); // Import supabase for direct queries if needed

exports.getCart = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    let cart = await Cart.getByUserId(req.session.user.id);
    if (!cart) {
      cart = await Cart.create(req.session.user.id);
      cart.cart_items = [];
    }
    res.render('cart', { title: 'Cart', cart, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.addToCart = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const { productId, qty } = req.body;
  const quantity = parseInt(qty);

  try {
    // Check product stock
    const product = await Product.getById(productId); // Need to ensure getById exists or use supabase
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let cart = await Cart.getByUserId(req.session.user.id);
    if (!cart) {
      cart = await Cart.create(req.session.user.id);
      cart.cart_items = [];
    }

    // Check current quantity in cart
    const currentItem = cart.cart_items ? cart.cart_items.find(item => item.product_id == productId) : null;
    const currentQty = currentItem ? currentItem.qty : 0;

    if (currentQty + quantity > product.stock) {
      return res.status(400).json({ error: `Cannot add ${quantity} items. Stock available: ${product.stock}. You have ${currentQty} in cart.` });
    }

    await Cart.addItem(cart.id, productId, quantity);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.removeFromCart = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const { itemId } = req.params;
  try {
    await Cart.removeItem(itemId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};
