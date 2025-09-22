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
  private apiKey: string;
  private baseUrl: string;
  private rateLimitDelay = 15000; // 15 seconds between requests (Alpha Vantage free tier: 25 requests/day = ~1 request per 57 minutes, but we use 15s to be safe)
  private lastRequestTime = 0;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.baseUrl = baseUrl || process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query';
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

  async getForexQuote(fromCurrency: string, toCurrency: string): Promise<AlphaVantageForexQuote | null> {
    try {
      await this.enforceRateLimit();

      const url = `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }

      const data: AlphaVantageForexResponse = await response.json();

      if (data['Realtime Currency Exchange Rate']) {
        return data['Realtime Currency Exchange Rate'];
      }

      // Check for API limit error
      if (data['Note'] || data['Information']) {
        console.warn('Alpha Vantage API limit reached or demo key used');
        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch forex quote from Alpha Vantage:', error);
      return null;
    }
  }

  async getForexTimeSeries(fromCurrency: string, toCurrency: string, interval: string = '5min', outputSize: string = 'compact'): Promise<AlphaVantageHistoricalData | null> {
    try {
      await this.enforceRateLimit();

      const url = `${this.baseUrl}?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }

      const data: AlphaVantageHistoricalData = await response.json();

      if (data['Time Series FX (5min)'] || data['Time Series FX (1min)'] || data['Time Series FX (15min)'] || data['Time Series FX (30min)'] || data['Time Series FX (60min)']) {
        return data;
      }

      // Check for API limit error
      if (data['Note'] || data['Information']) {
        console.warn('Alpha Vantage API limit reached or demo key used');
        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch forex time series from Alpha Vantage:', error);
      return null;
    }
  }

  // Get daily historical data (free tier doesn't support daily forex, so we'll simulate with intraday)
  async getForexDaily(fromCurrency: string, toCurrency: string): Promise<AlphaVantageHistoricalData | null> {
    // Note: Alpha Vantage free tier doesn't support daily forex data
    // We'll use 60min interval and aggregate to daily
    return this.getForexTimeSeries(fromCurrency, toCurrency, '60min', 'full');
  }
}