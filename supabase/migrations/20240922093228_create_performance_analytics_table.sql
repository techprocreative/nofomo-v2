-- Create performance analytics table

CREATE TABLE performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES trading_strategies(id) ON DELETE SET NULL,
    bot_id UUID REFERENCES mt5_bots(id) ON DELETE SET NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    period TEXT DEFAULT 'daily' CHECK (period IN ('daily', 'weekly', 'monthly')),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_performance_analytics_user_id ON performance_analytics(user_id);
CREATE INDEX idx_performance_analytics_strategy_id ON performance_analytics(strategy_id);
CREATE INDEX idx_performance_analytics_bot_id ON performance_analytics(bot_id);
CREATE INDEX idx_performance_analytics_metric_name ON performance_analytics(metric_name);
CREATE INDEX idx_performance_analytics_date ON performance_analytics(date);
CREATE INDEX idx_performance_analytics_period ON performance_analytics(period);

-- Enable Row Level Security
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics" ON performance_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON performance_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON performance_analytics
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics" ON performance_analytics
    FOR DELETE USING (auth.uid() = user_id);

-- Audit trigger
CREATE TRIGGER audit_performance_analytics
    AFTER INSERT OR UPDATE OR DELETE ON performance_analytics
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();