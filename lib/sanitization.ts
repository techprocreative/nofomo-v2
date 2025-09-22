export class Sanitizer {
  // Sanitize HTML content to prevent XSS (basic implementation)
  static sanitizeHTML(dirty: string): string {
    return dirty
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Sanitize text input (remove potentially dangerous characters)
  static sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .trim();
  }

  // Sanitize alphanumeric strings (for IDs, names, etc.)
  static sanitizeAlphanumeric(input: string): string {
    return input.replace(/[^a-zA-Z0-9\-_\s]/g, '').trim();
  }

  // Sanitize email (basic sanitization, validation is separate)
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Sanitize numbers (remove non-numeric characters except decimal point)
  static sanitizeNumber(input: string | number): string {
    const str = typeof input === 'number' ? input.toString() : input;
    return str.replace(/[^0-9.-]/g, '');
  }

  // Sanitize URL (basic sanitization)
  static sanitizeUrl(url: string): string {
    return url.trim().replace(/[<>"']/g, '');
  }

  // Deep sanitize object properties
  static sanitizeObject(obj: Record<string, any>, rules?: Record<string, (value: any) => any>): Record<string, any> {
    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (rules && rules[key]) {
        sanitized[key] = rules[key](value);
      } else {
        // Default sanitization based on value type
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeText(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          sanitized[key] = this.sanitizeObject(value, rules);
        }
        // Numbers, booleans, arrays, etc. are left as-is
      }
    }

    return sanitized;
  }

  // Sanitize array elements
  static sanitizeArray(arr: any[], sanitizer: (item: any) => any): any[] {
    return arr.map(sanitizer);
  }

  // Validate and sanitize forex symbol
  static sanitizeForexSymbol(symbol: string): string {
    return symbol.replace(/[^A-Z]/g, '').toUpperCase().slice(0, 7);
  }

  // Sanitize JSON string (parse and re-stringify to ensure valid JSON)
  static sanitizeJsonString(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch {
      return '{}'; // Return empty object if invalid
    }
  }

  // Sanitize SQL-like strings (additional protection for dynamic queries)
  static sanitizeForSQL(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove quotes, semicolons, backslashes
      .replace(/--/g, '') // Remove SQL comments
      .trim();
  }

  // Comprehensive input sanitization for API requests
  static sanitizeApiInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }

    if (typeof input === 'object' && input !== null) {
      if (Array.isArray(input)) {
        return input.map(item => this.sanitizeApiInput(item));
      }

      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(input)) {
        // Skip sensitive fields that shouldn't be logged or processed
        if (['password', 'token', 'secret', 'key'].includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
          continue;
        }

        sanitized[key] = this.sanitizeApiInput(value);
      }

      return sanitized;
    }

    return input;
  }

  // Sanitize trading strategy data specifically
  static sanitizeStrategyData(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };

    // Sanitize strategy name
    if (sanitized.name) {
      sanitized.name = this.sanitizeAlphanumeric(sanitized.name);
    }

    // Sanitize description (allow HTML)
    if (sanitized.description) {
      sanitized.description = this.sanitizeHTML(sanitized.description);
    }

    // Sanitize strategy_data deeply
    if (sanitized.strategy_data) {
      sanitized.strategy_data = this.sanitizeObject(sanitized.strategy_data, {
        name: (v: string) => this.sanitizeAlphanumeric(v),
        description: (v: string) => this.sanitizeHTML(v),
        conditions: (v: any[]) => v.map((c: string) => this.sanitizeText(c)),
        filters: (v: any) => this.sanitizeObject(v),
      });
    }

    return sanitized;
  }

  // Sanitize trade data specifically
  static sanitizeTradeData(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };

    // Sanitize symbol
    if (sanitized.symbol) {
      sanitized.symbol = this.sanitizeForexSymbol(sanitized.symbol);
    }

    // Sanitize numeric fields
    ['quantity', 'entry_price', 'exit_price', 'profit_loss'].forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = parseFloat(this.sanitizeNumber(sanitized[field]));
      }
    });

    return sanitized;
  }

  // Sanitize bot configuration data
  static sanitizeBotData(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };

    // Sanitize bot name
    if (sanitized.bot_name) {
      sanitized.bot_name = this.sanitizeAlphanumeric(sanitized.bot_name);
    }

    // Sanitize MT5 account ID (numeric only)
    if (sanitized.mt5_account_id) {
      sanitized.mt5_account_id = sanitized.mt5_account_id.toString().replace(/[^0-9]/g, '');
    }

    // Sanitize server name
    if (sanitized.mt5_server) {
      sanitized.mt5_server = this.sanitizeAlphanumeric(sanitized.mt5_server);
    }

    // Sanitize configuration
    if (sanitized.configuration) {
      sanitized.configuration = this.sanitizeObject(sanitized.configuration, {
        lotSize: (v: any) => parseFloat(this.sanitizeNumber(v)),
        stopLoss: (v: any) => this.sanitizeObject(v),
        takeProfit: (v: any) => this.sanitizeObject(v),
        maxSpread: (v: any) => parseFloat(this.sanitizeNumber(v)),
        slippage: (v: any) => parseInt(this.sanitizeNumber(v)),
      });
    }

    return sanitized;
  }
}

// Rate limiting helpers for additional protection
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  static checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key)!;

    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    this.requests.set(key, validTimestamps);

    if (validTimestamps.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    validTimestamps.push(now);
    return true;
  }

  static cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > oneHourAgo);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Set up periodic cleanup for rate limiter
if (typeof global !== 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 60 * 1000); // Clean up every minute
}