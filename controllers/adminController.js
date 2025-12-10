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
};

exports.postEditProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category_id, stock, image_url } = req.body;

    try {
        await supabase
            .from('products')
            .update({ name, price, description, category_id, stock })
            .eq('id', id);

        if (image_url) {
            // Delete existing images for this product
            await supabase.from('product_images').delete().eq('product_id', id);
            
            // Insert new image
            await supabase.from('product_images').insert([{ product_id: id, url: image_url }]);
        }

        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        res.redirect(`/admin/products/edit/${id}`);
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    await supabase.from('products').delete().eq('id', id);
    res.redirect('/admin/products');
};

exports.getOrders = async (req, res) => {
    const { data: orders } = await supabase
        .from('orders')
        .select('*, users(name, email)')
        .order('created_at', { ascending: false });

    res.render('admin/orders', {
        title: 'Manage Orders',
        user: req.session.user,
        orders: orders || []
    });
};

exports.getOrderDetail = async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log('Fetching order detail for ID:', id);
        console.log('Current user:', req.session.user);
        
        const { data: order, error } = await supabase
            .from('orders')
            .select('*, users(name, email), order_items(*, products(name, price))')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('admin/order_detail', {
            title: 'Order Detail',
            user: req.session.user,
            order
        });
    } catch (err) {
        console.error('Error in getOrderDetail:', err);
        res.status(500).send('Server Error');
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    await supabase.from('orders').update({ status }).eq('id', id);
    res.redirect('/admin/orders');
};

// Super Admin Only
exports.getUsers = async (req, res) => {
    const { data: users } = await supabase
        .from('users')
        .select('*, roles(name)')
        .order('created_at', { ascending: false });
        
    const { data: roles } = await supabase.from('roles').select('*');

    res.render('admin/users', {
        title: 'Manage Users',
        user: req.session.user,
        users: users || [],
        roles: roles || []
    });
};

exports.updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role_id } = req.body;
    await supabase.from('users').update({ role_id }).eq('id', id);
    res.redirect('/admin/users');
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Prevent deleting yourself
        if (parseInt(id) === req.session.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};

exports.postAddCategory = async (req, res) => {
    const { name } = req.body;
    try {
        const category = await Category.create(name);
        res.json({ success: true, category });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

exports.getDailyRevenueReport = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: orders } = await supabase
            .from('orders')
            .select('*, users(name, email)')
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: false });

        const totalRevenue = orders ? orders.reduce((sum, order) => sum + order.total_amount, 0) : 0;

        res.render('admin/daily_revenue', {
            title: 'Daily Revenue Report',
            user: req.session.user,
            orders: orders || [],
            totalRevenue,
            date: today.toLocaleDateString()
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getSuperAdminReport = async (req, res) => {
    if (req.session.user.roles.name !== 'super_admin') {
        return res.status(403).send('Unauthorized');
    }

    try {
        const { startDate, endDate } = req.query;
        
        let query = supabase.from('orders').select('*, users(name, email), order_items(*, products(name))');
        
        if (startDate) {
            query = query.gte('created_at', new Date(startDate).toISOString());
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte('created_at', end.toISOString());
        }
        
        const { data: filteredOrders } = await query.order('created_at', { ascending: false });

        // Get all orders for stats
        const { data: allOrders } = await supabase.from('orders').select('total_amount, created_at, status');
        const totalRevenue = allOrders.reduce((sum, order) => sum + (order.status !== 'cancelled' ? order.total_amount : 0), 0);
        const cancelledOrdersCount = allOrders.filter(o => o.status === 'cancelled').length;

        // New Users (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: newUsersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        res.render('admin/super_admin_report', {
            title: 'Super Admin Report',
            user: req.session.user,
            stats: {
                totalRevenue,
                cancelledOrdersCount,
                newUsersCount,
                totalOrders: allOrders.length
            },
            orders: filteredOrders || [],
            startDate: startDate || '',
            endDate: endDate || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
