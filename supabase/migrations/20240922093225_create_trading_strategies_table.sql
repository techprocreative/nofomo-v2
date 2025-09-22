-- Create trading strategies table

CREATE TABLE trading_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    strategy_data JSONB DEFAULT '{}'::jsonb,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trading_strategies_user_id ON trading_strategies(user_id);
CREATE INDEX idx_trading_strategies_status ON trading_strategies(status);
CREATE INDEX idx_trading_strategies_created_at ON trading_strategies(created_at);

-- Enable Row Level Security
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own strategies" ON trading_strategies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies" ON trading_strategies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies" ON trading_strategies
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies" ON trading_strategies
    FOR DELETE USING (auth.uid() = user_id);

-- Audit trigger
CREATE TRIGGER audit_trading_strategies
    AFTER INSERT OR UPDATE OR DELETE ON trading_strategies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();