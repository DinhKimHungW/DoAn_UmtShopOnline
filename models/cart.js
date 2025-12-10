const supabase = require('../config/supabase');

class Cart {
  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(*, product_images(*)))')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "The result contains 0 rows"
    return data;
  }

  static async create(userId) {
    const { data, error } = await supabase
      .from('carts')
      .insert([{ user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async addItem(cartId, productId, qty) {
    // Check if item exists
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ qty: existingItem.qty + qty })
        .eq('id', existingItem.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .insert([{ cart_id: cartId, product_id: productId, qty }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  static async removeItem(itemId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
  }

  static async clearCart(userId) {
    // First get the cart
    const cart = await this.getByUserId(userId);
    if (!cart) return;

    // Delete all cart items
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);
    
    if (error) throw error;
  }
}

module.exports = Cart;
