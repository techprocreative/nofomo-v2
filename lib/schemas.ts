import { z } from 'zod';

// Common validation helpers
const currencyCode = z.string().regex(/^[A-Z]{3}$/, 'Invalid currency code (must be 3 uppercase letters)');
const positiveNumber = z.number().positive('Must be a positive number');
const percentage = z.number().min(0).max(100, 'Percentage must be between 0 and 100');

// Trading indicators validation
const indicatorSchema = z.object({
  type: z.enum(['rsi', 'macd', 'bollinger_bands', 'moving_average', 'stochastics']),
  parameters: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
}).and(z.discriminatedUnion('type', [
  z.object({ type: z.literal('rsi'), parameters: z.object({ period: z.number().int().min(2).max(100).default(14) }).optional() }),
  z.object({ type: z.literal('macd'), parameters: z.object({
    fastPeriod: z.number().int().min(2).max(50).default(12),
    slowPeriod: z.number().int().min(2).max(100).default(26),
    signalPeriod: z.number().int().min(2).max(20).default(9)
  }).optional() }),
  z.object({ type: z.literal('bollinger_bands'), parameters: z.object({
    period: z.number().int().min(2).max(100).default(20),
    standardDeviations: z.number().min(0.5).max(5).default(2)
  }).optional() }),
  z.object({ type: z.literal('moving_average'), parameters: z.object({
    period: z.number().int().min(2).max(200).default(50),
    type: z.enum(['sma', 'ema', 'wma']).default('sma')
  }).optional() }),
  z.object({ type: z.literal('stochastics'), parameters: z.object({
    kPeriod: z.number().int().min(2).max(50).default(14),
    dPeriod: z.number().int().min(2).max(20).default(3)
  }).optional() }),
]));

const riskSettingsSchema = z.object({
  maxDrawdown: percentage.optional(),
  maxDailyLoss: percentage.optional(),
  maxPositionSize: percentage.optional(),
  stopLossPercentage: percentage.optional(),
  takeProfitPercentage: percentage.optional(),
  riskPerTrade: percentage.optional(),
  maxTradesPerDay: z.number().int().min(1).max(100).optional(),
});

// Profile schemas with enhanced validation
export const createProfileSchema = z.object({
  full_name: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-']+$/, 'Full name contains invalid characters').optional(),
  trading_preferences: z.object({
    preferredTimeframes: z.array(z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])).optional(),
    preferredPairs: z.array(currencyCode).max(20).optional(),
    tradingStyle: z.enum(['scalping', 'day_trading', 'swing_trading', 'position_trading']).optional(),
    autoTrading: z.boolean().optional(),
    notifications: z.object({
      tradeAlerts: z.boolean().optional(),
      priceAlerts: z.boolean().optional(),
      riskAlerts: z.boolean().optional(),
    }).optional(),
  }).optional(),
  risk_tolerance: z.number().min(0).max(1).refine(val => val % 0.1 === 0, 'Risk tolerance must be in increments of 0.1').optional(),
  preferred_currencies: z.array(currencyCode).max(10).optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

// Trading Strategy schemas with enhanced validation
const strategyParametersSchema = z.object({
  indicators: z.array(indicatorSchema).min(1, 'At least one indicator required').max(10, 'Maximum 10 indicators allowed'),
  entryConditions: z.array(z.string().min(1).max(500)).min(1, 'At least one entry condition required'),
  exitConditions: z.array(z.string().min(1).max(500)).optional(),
  filters: z.object({
    timeFilter: z.object({
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
      daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
    }).optional(),
    volatilityFilter: z.object({
      minVolatility: z.number().min(0).max(1).optional(),
      maxVolatility: z.number().min(0).max(1).optional(),
    }).optional(),
  }).optional(),
}).and(riskSettingsSchema);

export const createTradingStrategySchema = z.object({
  name: z.string().min(3).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Strategy name contains invalid characters'),
  description: z.string().min(10).max(1000).optional(),
  strategy_data: strategyParametersSchema,
  is_ai_generated: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export const updateTradingStrategySchema = createTradingStrategySchema.partial();

// Trade schemas with enhanced validation
const forexSymbol = z.string().regex(/^[A-Z]{6,7}$/, 'Invalid forex symbol format (e.g., EURUSD, GBPJPY)');

const baseTradeSchema = z.object({
  strategy_id: z.string().uuid().optional(),
  symbol: forexSymbol,
  side: z.enum(['buy', 'sell']),
  quantity: z.number().min(0.01, 'Minimum quantity is 0.01').max(10000, 'Maximum quantity is 10000').refine(val => Number(val.toFixed(2)) === val, 'Quantity must have at most 2 decimal places'),
  entry_price: z.number().min(0.00001, 'Minimum price is 0.00001').max(1000000, 'Maximum price is 1,000,000').refine(val => {
    const decimals = val.toString().split('.')[1]?.length || 0;
    return decimals <= 5;
  }, 'Price must have at most 5 decimal places'),
  exit_price: z.number().min(0.00001, 'Minimum price is 0.00001').max(1000000, 'Maximum price is 1,000,000').optional().refine(val => {
    if (val === undefined) return true;
    const decimals = val.toString().split('.')[1]?.length || 0;
    return decimals <= 5;
  }, 'Price must have at most 5 decimal places'),
  status: z.enum(['open', 'closed', 'cancelled']).default('open'),
  entry_time: z.string().datetime().refine(val => {
    const date = new Date(val);
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    return date >= oneYearAgo && date <= now;
  }, 'Entry time must be within the last year and not in the future').optional(),
  exit_time: z.string().datetime().optional().refine((val: string | undefined) => {
    if (!val) return true;
    const date = new Date(val);
    const now = new Date();
    return date <= now;
  }, 'Exit time must not be in the future'),
  profit_loss: z.number().min(-1000000, 'Minimum P/L is -1,000,000').max(1000000, 'Maximum P/L is 1,000,000').refine(val => Number(val.toFixed(2)) === val, 'P/L must have at most 2 decimal places').optional(),
});

export const createTradeSchema = baseTradeSchema.superRefine((data, ctx) => {
  // If status is closed, exit_price and exit_time are required
  if (data.status === 'closed') {
    if (data.exit_price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closed trades must have exit_price',
        path: ['exit_price'],
      });
    }
    if (data.exit_time === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closed trades must have exit_time',
        path: ['exit_time'],
      });
    }
  }

  // Exit time must be after entry time
  if (data.exit_time && data.entry_time) {
    const exitDate = new Date(data.exit_time);
    const entryDate = new Date(data.entry_time);
    if (exitDate <= entryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exit time must be after entry time',
        path: ['exit_time'],
      });
    }
  }
});

export const updateTradeSchema = baseTradeSchema.partial();

// MT5 Bot schemas with enhanced validation
const botConfigurationSchema = z.object({
  lotSize: z.number().min(0.01, 'Minimum lot size is 0.01').max(100, 'Maximum lot size is 100').refine(val => Number(val.toFixed(2)) === val, 'Lot size must have at most 2 decimal places'),
  stopLoss: z.object({
    type: z.enum(['percentage', 'pips', 'fixed']),
    value: z.number().positive('Stop loss value must be positive'),
  }).refine(data => {
    if (data.type === 'percentage') return data.value <= 100;
    if (data.type === 'pips') return data.value <= 10000;
    if (data.type === 'fixed') return data.value <= 1000000;
    return true;
  }, 'Stop loss value out of range for selected type'),
  takeProfit: z.object({
    type: z.enum(['percentage', 'pips', 'fixed']),
    value: z.number().positive('Take profit value must be positive'),
  }).refine(data => {
    if (data.type === 'percentage') return data.value <= 1000;
    if (data.type === 'pips') return data.value <= 10000;
    if (data.type === 'fixed') return data.value <= 1000000;
    return true;
  }, 'Take profit value out of range for selected type').optional(),
  maxSpread: z.number().min(0).max(1000, 'Maximum spread is 1000 pips').optional(),
  slippage: z.number().min(0).max(100, 'Maximum slippage is 100 pips').optional(),
  tradingHours: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1),
  }).optional(),
}).and(riskSettingsSchema);

export const createMT5BotSchema = z.object({
  bot_name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Bot name contains invalid characters'),
  mt5_account_id: z.string().regex(/^[0-9]{6,12}$/, 'MT5 account ID must be 6-12 digits'),
  mt5_server: z.string().min(3).max(100).regex(/^[a-zA-Z0-9\.\-_]+$/, 'Server name contains invalid characters').optional(),
  api_key: z.string().regex(/^[a-zA-Z0-9]{32,64}$/, 'API key must be 32-64 alphanumeric characters').optional(),
  configuration: botConfigurationSchema,
  performance_metrics: z.object({
    totalTrades: z.number().int().min(0).optional(),
    winRate: percentage.optional(),
    profitFactor: z.number().min(0).max(10).optional(),
    maxDrawdown: percentage.optional(),
    sharpeRatio: z.number().min(-5).max(5).optional(),
  }).optional(),
  is_active: z.boolean().default(true),
  last_run: z.string().datetime().optional(),
});

export const updateMT5BotSchema = createMT5BotSchema.partial();

// Performance Analytics schemas
export const createPerformanceAnalyticsSchema = z.object({
  strategy_id: z.string().uuid().optional(),
  bot_id: z.string().uuid().optional(),
  metric_name: z.string().min(1).max(100),
  metric_value: z.number(),
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  date: z.string().date(),
});

export const updatePerformanceAnalyticsSchema = createPerformanceAnalyticsSchema.partial();

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// UUID parameter schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// Query schemas for filtering
export const tradingStrategyQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export const tradeQuerySchema = z.object({
  symbol: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  status: z.enum(['open', 'closed', 'cancelled']).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export const mt5BotQuerySchema = z.object({
  is_active: z.boolean().optional(),
});

export const analyticsQuerySchema = z.object({
  metric_name: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});