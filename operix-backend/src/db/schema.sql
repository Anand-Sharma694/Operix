-- Operix AI Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  category VARCHAR(100),
  unit_price DECIMAL(12,2) DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  revenue DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory snapshots table
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  stock_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL, -- 'demand_7d', 'demand_30d', 'demand_90d'
  predicted_value DECIMAL(12,2),
  confidence VARCHAR(20), -- 'high', 'medium', 'low'
  model_used VARCHAR(100),
  data_points INTEGER,
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  risk_type VARCHAR(50) NOT NULL, -- 'stockout', 'overstock', 'decline', 'anomaly', 'demand_change'
  severity VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  title VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  details JSONB
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  rec_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  metric_value DECIMAL(12,2),
  metric_label VARCHAR(100),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product_date ON sales(product_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_risks_business ON risks(business_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_recommendations_business ON recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_business_product ON inventory_snapshots(business_id, product_id, snapshot_date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
