import { supabaseAdmin } from '../../infrastructure/database/supabaseClient.js';

class OrderDatabaseService {
  /**
   * Create a new order in the database
   */
  async createOrder(userId, orderData) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          user_id: userId,
          market_id: orderData.market,
          outcome: orderData.outcome,
          side: orderData.side,
          amount: orderData.amount,
          price: orderData.price,
          total_cost: orderData.totalCost,
          signature: orderData.signature,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Database error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return data[0];
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, polymarketOrderId = null) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const updateData = { status, updated_at: new Date().toISOString() };
    if (polymarketOrderId) {
      updateData.polymarket_order_id = polymarketOrderId;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('Database error updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return data[0];
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, limit = 50, offset = 0) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const { data, error, count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error fetching orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return { data, count };
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Database error fetching order:', error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data;
  }

  /**
   * Store user's Polymarket API credentials
   */
  async storePolymarketCredentials(userId, credentials) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const { data, error } = await supabaseAdmin
      .from('polymarket_credentials')
      .upsert(
        [
          {
            user_id: userId,
            api_key: credentials.apiKey,
            api_secret: credentials.apiSecret,
            clob_client_address: credentials.clobClientAddress,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'user_id' }
      )
      .select();

    if (error) {
      console.error('Database error storing credentials:', error);
      throw new Error(`Failed to store credentials: ${error.message}`);
    }

    return data[0];
  }

  /**
   * Get user's Polymarket credentials
   */
  async getPolymarketCredentials(userId) {
    if (!supabaseAdmin) {
      throw new Error('Database connection not available');
    }

    const { data, error } = await supabaseAdmin
      .from('polymarket_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error fetching credentials:', error);
      throw new Error(`Failed to fetch credentials: ${error.message}`);
    }

    return data || null;
  }
}

export default OrderDatabaseService;
