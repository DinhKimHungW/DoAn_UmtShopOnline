const supabase = require('../config/supabase');

class Order {
  static async create(orderData, items) {
    // Start a transaction-like operation (Supabase doesn't support transactions directly via JS client easily without RPC, 
    // but we will insert order first then items)
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      qty: item.qty,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Ideally we should rollback order creation here
      console.error('Error creating order items:', itemsError);
      throw itemsError;
    }

    // Decrease stock for each product
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (productError) {
        console.error('Error fetching product stock:', productError);
        continue;
      }

      if (product && product.stock >= item.qty) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: product.stock - item.qty })
          .eq('id', item.product_id);
        
        if (updateError) {
          console.error('Error updating product stock:', updateError);
        }
      } else {
        console.warn(`Insufficient stock for product ${item.product_id}`);
      }
    }

    return order;
  }

  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getById(orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateStatus(orderId, status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = Order;
