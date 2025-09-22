import { MT5ConnectionConfig } from './types';

export interface MT5Config {
  connection: MT5ConnectionConfig;
  connectionPool: {
    size: number;
    idleTimeout: number;
    healthCheckInterval: number;
  };
  symbols: Record<string, string>;
  riskManagement: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxSpread: number;
    defaultSlippage: number;
    maxLeverage: number;
    minMarginLevel: number;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

function getEnvJson<T>(name: string, defaultValue: T): T {
  const value = process.env[name];
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Environment variable ${name} must be valid JSON`);
  }
}

export const mt5Config: MT5Config = {
  connection: {
    account: getEnvVar('MT5_ACCOUNT_ID', '12345678'), // Default demo account
    password: getEnvVar('MT5_PASSWORD', 'demo_password'), // Default demo password
    server: getEnvVar('MT5_SERVER', 'localhost:8080'), // Default local server
    timeout: getEnvNumber('MT5_TIMEOUT', 30000),
    maxRetries: getEnvNumber('MT5_MAX_RETRIES', 3),
    retryDelay: getEnvNumber('MT5_RETRY_DELAY', 1000),
  },
  connectionPool: {
    size: getEnvNumber('MT5_CONNECTION_POOL_SIZE', 5),
    idleTimeout: getEnvNumber('MT5_CONNECTION_IDLE_TIMEOUT', 60000),
    healthCheckInterval: getEnvNumber('MT5_HEALTH_CHECK_INTERVAL', 30000),
  },
  symbols: getEnvJson<Record<string, string>>('MT5_SYMBOL_MAPPINGS', {
    EURUSD: 'EURUSD',
    GBPUSD: 'GBPUSD',
    USDJPY: 'USDJPY',
    AUDUSD: 'AUDUSD',
    USDCAD: 'USDCAD',
    USDCHF: 'USDCHF',
    NZDUSD: 'NZDUSD',
    EURJPY: 'EURJPY',
    GBPJPY: 'GBPJPY',
  }),
  riskManagement: {
    maxPositionSize: getEnvNumber('MT5_MAX_POSITION_SIZE', 0.1),
    maxDailyLoss: getEnvNumber('MT5_MAX_DAILY_LOSS', 100),
    maxSpread: getEnvNumber('MT5_MAX_SPREAD', 3),
    defaultSlippage: getEnvNumber('MT5_DEFAULT_SLIPPAGE', 2),
    maxLeverage: getEnvNumber('MT5_MAX_LEVERAGE', 100),
    minMarginLevel: getEnvNumber('MT5_MIN_MARGIN_LEVEL', 50),
  },
};

export function validateMT5Config(): void {
  const missingFields: string[] = [];

  // Only validate if we're not using the default demo values
  if (mt5Config.connection.account === '12345678' &&
      !process.env.MT5_ACCOUNT_ID) {
    missingFields.push('MT5_ACCOUNT_ID');
  }
  if (mt5Config.connection.password === 'demo_password' &&
      !process.env.MT5_PASSWORD) {
    missingFields.push('MT5_PASSWORD');
  }
  if (mt5Config.connection.server === 'localhost:8080' &&
      !process.env.MT5_SERVER) {
    missingFields.push('MT5_SERVER');
  }

  if (missingFields.length > 0) {
    console.warn(
      `MT5 configuration is using default demo values. For production use, please set: ${missingFields.join(', ')}`
    );
  }
}

export function isUsingDemoCredentials(): boolean {
  return mt5Config.connection.account === '12345678' ||
         mt5Config.connection.password === 'demo_password' ||
         mt5Config.connection.server === 'localhost:8080';
}

export default mt5Config;