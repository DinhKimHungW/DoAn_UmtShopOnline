const supabase = require('../config/supabase');
const Category = require('../models/category');

exports.getDashboard = async (req, res) => {
    try {
        // Fetch stats
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        // Calculate Daily Revenue (orders created today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: dailyOrders } = await supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', today.toISOString());
            
        const dailyRevenue = dailyOrders ? dailyOrders.reduce((sum, order) => sum + order.total_amount, 0) : 0;

        // Recent orders
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('*, users(name)')
            .order('created_at', { ascending: false })
            .limit(5);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.session.user,
            stats: { productCount, orderCount, userCount, dailyRevenue },
            recentOrders
        });
    } catch (err) {
        console.error(err);
        res.render('admin/dashboard', { title: 'Admin Dashboard', user: req.session.user, error: 'Error loading dashboard' });
    }
};

exports.getProducts = async (req, res) => {
    const { data: products, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });

    res.render('admin/products', {
        title: 'Manage Products',
        user: req.session.user,
        products: products || []
    });
};

exports.getAddProduct = async (req, res) => {
    const { data: categories } = await supabase.from('categories').select('*');
    res.render('admin/product_form', {
        title: 'Add Product',
        user: req.session.user,
        categories: categories || [],
        product: null
    });
};

exports.postAddProduct = async (req, res) => {
    // Implementation for adding product
    // Need to handle image upload separately or assume URL for now
    const { name, price, description, category_id, stock, image_url } = req.body;
    const slug = name.toLowerCase().replace(/ /g, '-') + '-' + Date.now();

    try {
        const { data: product, error } = await supabase
            .from('products')
            .insert([{ name, slug, price, description, category_id, stock }])
            .select()
            .single();

        if (error) throw error;

        if (image_url) {
            await supabase.from('product_images').insert([{ product_id: product.id, url: image_url }]);
        }

        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/products/add');
    }
};

exports.getEditProduct = async (req, res) => {
    const { id } = req.params;
    const { data: product } = await supabase.from('products').select('*, product_images(url)').eq('id', id).single();
    const { data: categories } = await supabase.from('categories').select('*');

    res.render('admin/product_form', {
        title: 'Edit Product',
        user: req.session.user,
        categories: categories || [],
        product: product
    });