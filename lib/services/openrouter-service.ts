import {
  OpenRouterMessage,
  OpenRouterRequest,
  OpenRouterResponse,
  OpenRouterError,
  OpenRouterModel
} from '@/lib/types';

export interface IOpenRouterService {
  chat(messages: OpenRouterMessage[], options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<OpenRouterResponse>;
  listModels(): Promise<OpenRouterModel[]>;
}

export class OpenRouterService implements IOpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey?: string,
    baseUrl?: string,
    defaultModel?: string
  ) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.defaultModel = defaultModel || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

    // Don't throw error in constructor, handle it gracefully
    if (!this.apiKey) {
      console.warn('OpenRouter API key not provided');
    }
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required but not provided');
    }
  }

  async chat(
    messages: OpenRouterMessage[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<OpenRouterResponse> {
    this.ensureApiKey();

    const {
      model = this.defaultModel,
      temperature = 0.7,
      max_tokens = 2000,
      stream = false
    } = options;

    const request: OpenRouterRequest = {
      model,
      messages,
      temperature,
      max_tokens,
      stream
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'ForexAI Strategy Builder'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterError;
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      return data;
    } catch (error) {
      console.error('OpenRouter API call failed:', error);
      throw error;
    }
  }

  async listModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to list OpenRouter models:', error);
      return [];
    }
  }

  // Specialized methods for trading strategy generation
  async generateTradingStrategy(
    prompt: string,
    marketData: any,
    riskProfile: string = 'moderate'
  ): Promise<string> {
    const systemPrompt = `You are an expert forex trading strategist AI. Generate a detailed trading strategy based on the user's requirements.

Market Context: ${JSON.stringify(marketData)}
Risk Profile: ${riskProfile}

Provide a comprehensive strategy including:
1. Entry conditions with specific indicators and thresholds
2. Exit conditions (take profit and stop loss)
3. Risk management rules
4. Position sizing guidelines
5. Timeframe recommendations
6. Market conditions for activation

Format your response as a structured JSON object with these fields:
{
  "name": "Strategy Name",
  "description": "Brief description",
  "indicators": ["list of required indicators"],
  "entry_conditions": "detailed entry rules",
  "exit_conditions": "detailed exit rules",
  "risk_management": "risk management rules",
  "position_sizing": "position sizing guidelines",
  "timeframe": "recommended timeframe",
  "market_conditions": "when to activate the strategy"
}`;

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.chat(messages, {
      temperature: 0.3, // Lower temperature for more consistent strategy generation
      max_tokens: 1500,
      model: 'anthropic/claude-3-sonnet' // Use more capable model for complex tasks
    });

    return response.choices[0]?.message?.content || '';
  }

  async analyzeMarket(
    marketData: any,
    timeframe: string,
    analysisType: 'technical' | 'sentiment' | 'comprehensive' = 'comprehensive'
  ): Promise<string> {
    const systemPrompt = `You are an expert market analyst. Analyze the provided market data and provide insights.

Analysis Type: ${analysisType}
Timeframe: ${timeframe}

Provide analysis covering:
1. Trend analysis (primary and secondary trends)
2. Technical indicators analysis
3. Support/resistance levels
4. Volatility assessment
5. Market sentiment indicators
6. Trading opportunities and risks
7. Recommended indicators for trading

Format as structured JSON:
{
  "trend_analysis": {
    "primary_trend": "up|down|sideways",
    "trend_strength": 0-100,
    "cycle_position": 0-1
  },
  "technical_indicators": {
    "rsi": "analysis",
    "macd": "analysis",
    "bollinger_bands": "analysis"
  },
  "support_resistance": ["list of levels"],
  "volatility_index": 0-1,
  "sentiment_score": -1 to 1,
  "opportunities": ["list"],
  "risks": ["list"],
  "recommended_indicators": ["list"]
}`;

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Analyze this market data: ${JSON.stringify(marketData)}`
      }
    ];

    const response = await this.chat(messages, {
      temperature: 0.2, // Low temperature for consistent analysis
      max_tokens: 1200
    });

    return response.choices[0]?.message?.content || '';
  }

  async optimizeStrategy(
    strategy: any,
    backtestResults: any,
    optimizationGoals: string[]
  ): Promise<string> {
    const systemPrompt = `You are an expert in strategy optimization. Analyze the strategy performance and suggest optimizations.

Optimization Goals: ${optimizationGoals.join(', ')}

Provide optimization recommendations including:
1. Parameter adjustments
2. Additional filters or conditions
3. Risk management improvements
4. Performance enhancement suggestions
5. Alternative indicator combinations

Format as structured JSON:
{
  "parameter_optimizations": {
    "indicator_name": {
      "current_value": "value",
      "recommended_value": "value",
      "expected_improvement": "description"
    }
  },
  "additional_filters": ["new conditions"],
  "risk_improvements": ["recommendations"],
  "performance_suggestions": ["suggestions"],
  "alternative_indicators": ["suggestions"],
  "expected_overall_improvement": "percentage or description"
}`;

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Strategy: ${JSON.stringify(strategy)}\nBacktest Results: ${JSON.stringify(backtestResults)}`
      }
    ];

    const response = await this.chat(messages, {
      temperature: 0.4,
      max_tokens: 1000,
      model: 'anthropic/claude-3-haiku' // Use faster model for optimization
    });

    return response.choices[0]?.message?.content || '';
  }
}