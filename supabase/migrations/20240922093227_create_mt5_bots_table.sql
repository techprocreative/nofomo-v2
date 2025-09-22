-- Create MT5 bots table

CREATE TABLE mt5_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL,
    mt5_account_id TEXT NOT NULL,
    mt5_server TEXT,
    api_key TEXT, -- Note: In production, encrypt sensitive data
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mt5_bots_user_id ON mt5_bots(user_id);
CREATE INDEX idx_mt5_bots_is_active ON mt5_bots(is_active);
CREATE INDEX idx_mt5_bots_created_at ON mt5_bots(created_at);

-- Enable Row Level Security
ALTER TABLE mt5_bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bots" ON mt5_bots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bots" ON mt5_bots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots" ON mt5_bots
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots" ON mt5_bots
    FOR DELETE USING (auth.uid() = user_id);

-- Audit trigger
CREATE TRIGGER audit_mt5_bots
    AFTER INSERT OR UPDATE OR DELETE ON mt5_bots
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();