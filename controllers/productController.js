const Product = require('../models/product');
const Review = require('../models/review');


exports.getIndex = async (req, res) => {
  try {
    const { products } = await Product.getAll({ limit: 8 });
    res.render('index', { 
      title: 'Home', 
      products, 
      user: req.session.user 
    });
  } catch (err) {
    console.error('Error in getIndex:', err.message);
    // If it's a database error, we might want to show the page with empty products
    // and a flash message (if we had flash messages set up).
    // For now, let's render the index with empty products and log the error.
    res.render('index', { 
      title: 'Home', 
      products: [], 
      user: req.session.user,
      error: 'Database connection failed. Please check your .env configuration.'
    });
  }
};

exports.getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const category = req.query.category;
  const q = req.query.q;

  try {
    const { products, total } = await Product.getAll({ page, limit, category, q });
    const totalPages = Math.ceil(total / limit);

    res.render('products', {
      title: 'Products',
      products,
      currentPage: page,
      totalPages,
      category,
      q,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error in getProducts:', err.message);
    res.render('products', {
      title: 'Products',
      products: [],
      currentPage: 1,
      totalPages: 1,
      category,
      q,
      user: req.session.user,
      error: 'Database connection failed. Please check your .env configuration.'
    });
  }
};

exports.getProductDetail = async (req, res) => {
  const slug = req.params.slug;
  try {
    const product = await Product.getBySlug(slug);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const reviews = await Review.getByProductId(product.id);

    res.render('product_detail', {
      title: product.name,
      product,
      reviews,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.postReview = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { product_id, rating, content } = req.body;
  
  try {
    await Review.create({
      user_id: req.session.user.id,
      product_id,
      rating,
      content
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};
