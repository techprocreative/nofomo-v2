export interface AlphaVantageForexQuote {
  '1. From_Currency Code': string;
  '2. From_Currency Name': string;
  '3. To_Currency Code': string;
  '4. To_Currency Name': string;
  '5. Exchange Rate': string;
  '6. Last Refreshed': string;
  '7. Time Zone': string;
  '8. Bid Price': string;
  '9. Ask Price': string;
}

export interface AlphaVantageForexResponse {
  'Realtime Currency Exchange Rate'?: AlphaVantageForexQuote;
  'Note'?: string;
  'Information'?: string;
  'Error Message'?: string;
}

export interface AlphaVantageHistoricalData {
  'Meta Data'?: {
    '1. Information': string;
    '2. From Symbol': string;
    '3. To Symbol': string;
    '4. Last Refreshed': string;
    '5. Interval': string;
    '6. Output Size': string;
    '7. Time Zone': string;
  };
  'Time Series FX (5min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
  'Time Series FX (1min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
  'Time Series FX (15min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
  'Time Series FX (30min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
  'Time Series FX (60min)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
  }>;
  'Note'?: string;
  'Information'?: string;
  'Error Message'?: string;
}

export class AlphaVantageService {
  private apiKeys: string[];
  private baseUrl: string;
  private rateLimitDelay = 1000; // 1 second between requests for faster development (Alpha Vantage free tier: 25 requests/day = ~1 request per 57 minutes)
  private lastRequestTime = 0;
  private keyUsage: Map<string, number> = new Map();
  private failedKeys: Set<string> = new Set();
  private currentKeyIndex = 0;
  private keyCooldownTime = 5 * 60 * 1000; // 5 minutes cooldown for failed keys
  private keyFailureTimes: Map<string, number> = new Map();

  constructor(apiKeys?: string[], baseUrl?: string) {
    // Initialize with primary key from env and backup key
    const primaryKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const backupKey = 'KFUXGJIUO980QG93';

    this.apiKeys = apiKeys || [primaryKey, backupKey].filter(key => key && key !== 'demo');
    this.baseUrl = baseUrl || process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query';

    // Initialize usage tracking
    this.apiKeys.forEach(key => this.keyUsage.set(key, 0));

    console.log(`Alpha Vantage Service initialized with ${this.apiKeys.length} API keys`);
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private getAvailableKeys(): string[] {
    const now = Date.now();
    const availableKeys: string[] = [];

    for (const key of this.apiKeys) {
      const failureTime = this.keyFailureTimes.get(key);
      if (!failureTime || (now - failureTime) > this.keyCooldownTime) {
        availableKeys.push(key);
      }
    }

    return availableKeys;
  }


  private markKeyFailed(key: string): void {
    this.failedKeys.add(key);
    this.keyFailureTimes.set(key, Date.now());
    console.warn(`Marked API key as failed: ${key.substring(0, 8)}...`);
  }

  private recordKeyUsage(key: string): void {
    const currentUsage = this.keyUsage.get(key) || 0;
    this.keyUsage.set(key, currentUsage + 1);
  }

  private selectApiKey(): string {
    const availableKeys = this.getAvailableKeys();

    if (availableKeys.length === 0) {
      throw new Error('No available API keys');
    }

    // Select key with least usage for better load balancing
    let selectedKey = availableKeys[0];
    let minUsage = this.keyUsage.get(selectedKey) || 0;

    for (const key of availableKeys) {
      const usage = this.keyUsage.get(key) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedKey = key;
      }
    }

    return selectedKey;
  }

  // Public methods for monitoring
  getKeyUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.keyUsage.forEach((usage, key) => {
      stats[key.substring(0, 8) + '...'] = usage;
    });
    return stats;
  }

  resetFailedKeys(): void {
    this.failedKeys.clear();
    this.keyFailureTimes.clear();
    console.log('Reset all failed API keys');
  }

  getAvailableKeyCount(): number {
    return this.getAvailableKeys().length;
  }

  private async makeApiRequest(urlTemplate: string, key: string): Promise<any> {
    const url = urlTemplate.replace('${apiKey}', key);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getForexQuote(fromCurrency: string, toCurrency: string): Promise<AlphaVantageForexQuote | null> {
    const availableKeys = this.getAvailableKeys();

    if (availableKeys.length === 0) {
      console.error('No available API keys for Alpha Vantage');
      return null;
    }

    for (const apiKey of availableKeys) {
      try {
        await this.enforceRateLimit();

        const urlTemplate = `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=\${apiKey}`;
        const data: AlphaVantageForexResponse = await this.makeApiRequest(urlTemplate, apiKey);

        if (data['Realtime Currency Exchange Rate']) {
          this.recordKeyUsage(apiKey);
          return data['Realtime Currency Exchange Rate'];
        }

        // Check for API limit error or key issues
        if (data['Note'] || data['Information'] || data['Error Message']) {
          console.warn(`Alpha Vantage API issue with key ${apiKey.substring(0, 8)}...: ${data['Note'] || data['Information'] || data['Error Message']}`);
          this.markKeyFailed(apiKey);
          continue; // Try next key
        }

        return null;
      } catch (error) {
        console.error(`Failed to fetch forex quote with key ${apiKey.substring(0, 8)}...:`, error);
        this.markKeyFailed(apiKey);
        continue; // Try next key
      }
    }

    console.error('All API keys failed for forex quote request');
    return null;
  }

  async getForexTimeSeries(fromCurrency: string, toCurrency: string, interval: string = '5min', outputSize: string = 'compact'): Promise<AlphaVantageHistoricalData | null> {
    const availableKeys = this.getAvailableKeys();

    if (availableKeys.length === 0) {
      console.error('No available API keys for Alpha Vantage');
      return null;
    }

    for (const apiKey of availableKeys) {
      try {
        await this.enforceRateLimit();

        const urlTemplate = `${this.baseUrl}?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=${interval}&outputsize=${outputSize}&apikey=\${apiKey}`;
        const data: AlphaVantageHistoricalData = await this.makeApiRequest(urlTemplate, apiKey);

        if (data['Time Series FX (5min)'] || data['Time Series FX (1min)'] || data['Time Series FX (15min)'] || data['Time Series FX (30min)'] || data['Time Series FX (60min)']) {
          this.recordKeyUsage(apiKey);
          return data;
        }

        // Check for API limit error or key issues
        if (data['Note'] || data['Information'] || data['Error Message']) {
          console.warn(`Alpha Vantage API issue with key ${apiKey.substring(0, 8)}...: ${data['Note'] || data['Information'] || data['Error Message']}`);
          this.markKeyFailed(apiKey);
          continue; // Try next key
        }

        return null;
      } catch (error) {
        console.error(`Failed to fetch forex time series with key ${apiKey.substring(0, 8)}...:`, error);
        this.markKeyFailed(apiKey);
        continue; // Try next key
      }
    }

    console.error('All API keys failed for forex time series request');
    return null;
  }

  // Get daily historical data (free tier doesn't support daily forex, so we'll simulate with intraday)
  async getForexDaily(fromCurrency: string, toCurrency: string): Promise<AlphaVantageHistoricalData | null> {
    // Note: Alpha Vantage free tier doesn't support daily forex data
    // We'll use 60min interval and aggregate to daily
    return this.getForexTimeSeries(fromCurrency, toCurrency, '60min', 'full');
  }
}