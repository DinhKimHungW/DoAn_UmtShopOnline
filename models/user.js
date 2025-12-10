const supabase = require('../config/supabase');

class User {
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('email', email)
      .single();
    
    if (error) return null;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  static async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('*, roles(name)')
      .single();
    
    if (error) throw error;
    return data;
  }
}

module.exports = User;
