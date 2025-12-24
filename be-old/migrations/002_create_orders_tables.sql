-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  amount DECIMAL(18, 8) NOT NULL,
  price DECIMAL(5, 4) NOT NULL CHECK (price >= 0.01 AND price <= 0.99),
  total_cost DECIMAL(18, 2) NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'failed')),
  polymarket_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created_at (created_at)
);

-- Create polymarket_credentials table
CREATE TABLE IF NOT EXISTS polymarket_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  clob_client_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  INDEX idx_polymarket_credentials_user_id (user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for polymarket_credentials
CREATE POLICY "Users can view their own Polymarket credentials"
  ON polymarket_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Polymarket credentials"
  ON polymarket_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Polymarket credentials"
  ON polymarket_credentials FOR UPDATE
  USING (auth.uid() = user_id);

-- Add wallet_address column to auth.users if it doesn't exist
-- Note: You may need to do this through the Supabase dashboard instead
-- as it requires modifying the auth schema
