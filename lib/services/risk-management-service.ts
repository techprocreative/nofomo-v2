import {
  PositionRisk,
  RiskLimits,
  MT5Position,
  MT5AccountInfo,
} from '../types';
import { mt5Service } from './mt5-service';
import { Cache } from '../cache';
import { LiveTradingService } from './live-trading-service';

export interface IRiskManagementService {
  calculatePortfolioRisk(userId: string): Promise<PositionRisk[]>;
  monitorDrawdown(userId: string): Promise<{ currentDrawdown: number; maxDrawdown: number; breach: boolean }>;
  checkCorrelationRisk(positions: MT5Position[]): Promise<{ correlationRisk: number; breached: boolean }>;
  applyAutoStops(position: MT5Position, riskLimits: RiskLimits): Promise<boolean>;
  calculateVaR(positions: MT5Position[], confidence: number): Promise<number>;
  getRiskMetrics(userId: string): Promise<{
    totalExposure: number;
    marginUtilization: number;
    dailyPnL: number;
    riskScore: number;
  }>;
  emergencyStop(userId: string, reason: string): Promise<{ closedPositions: number; totalLoss: number }>;
}

export class RiskManagementService implements IRiskManagementService {
  constructor(private cache: Cache) {}

  async calculatePortfolioRisk(userId: string): Promise<PositionRisk[]> {
    const positionsResult = await mt5Service.getPositions();
    if (!positionsResult.success || !positionsResult.data) {
      return [];
    }

    const accountInfo = await mt5Service.getAccountInfo();
    const equity = accountInfo.data?.equity || 10000;

    const riskAssessments = await Promise.all(
      positionsResult.data.map(position => this.assessPositionRisk(position, equity))
    );

    return riskAssessments;
  }

  async monitorDrawdown(userId: string): Promise<{ currentDrawdown: number; maxDrawdown: number; breach: boolean }> {
    const cacheKey = `drawdown:${userId}`;
    const cached = this.cache.get<{ currentDrawdown: number; maxDrawdown: number; breach: boolean }>(cacheKey);

    if (cached) return cached;

    const accountInfo = await mt5Service.getAccountInfo();
    if (!accountInfo.success || !accountInfo.data) {
      throw new Error('Unable to retrieve account information');
    }

    const { balance, equity } = accountInfo.data;
    const currentDrawdown = ((balance - equity) / balance) * 100;

    // Get historical max drawdown (simplified - would need historical data)
    const maxDrawdown = Math.max(currentDrawdown, this.getHistoricalMaxDrawdown(userId));

    // Check against risk limits (default 5%)
    const breach = currentDrawdown > 5;

    const result = { currentDrawdown, maxDrawdown, breach };
    this.cache.set(cacheKey, result, 300000); // 5 minutes

    return result;
  }

  async checkCorrelationRisk(positions: MT5Position[]): Promise<{ correlationRisk: number; breached: boolean }> {
    if (positions.length < 2) {
      return { correlationRisk: 0, breached: false };
    }

    // Calculate correlation matrix (simplified)
    const symbols = [...new Set(positions.map(p => p.symbol))];
    const correlations: { [key: string]: number } = {};

    // Mock correlation data - in real implementation, use historical price data
    const correlationMatrix: { [key: string]: { [key: string]: number } } = {
      'EURUSD': { 'EURUSD': 1, 'GBPUSD': 0.8, 'USDJPY': -0.6 },
      'GBPUSD': { 'EURUSD': 0.8, 'GBPUSD': 1, 'USDJPY': -0.5 },
      'USDJPY': { 'EURUSD': -0.6, 'GBPUSD': -0.5, 'USDJPY': 1 },
    };

    let totalCorrelationRisk = 0;
    let pairCount = 0;

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const correlation = correlationMatrix[symbol1]?.[symbol2] || 0;
        totalCorrelationRisk += Math.abs(correlation);
        pairCount++;
      }
    }

    const averageCorrelation = pairCount > 0 ? totalCorrelationRisk / pairCount : 0;
    const correlationRisk = averageCorrelation * 100; // Convert to percentage

    // Breach if average correlation > 70%
    const breached = correlationRisk > 70;

    return { correlationRisk, breached };
  }

  async applyAutoStops(position: MT5Position, riskLimits: RiskLimits): Promise<boolean> {
    try {
      const accountInfo = await mt5Service.getAccountInfo();
      if (!accountInfo.success || !accountInfo.data) {
        return false;
      }

      const equity = accountInfo.data.equity;
      const positionValue = position.volume * position.price_open;
      const riskPercentage = (positionValue / equity) * 100;

      // Apply automatic stop loss if position exceeds risk limits
      if (riskPercentage > riskLimits.max_position_size * 100) {
        const stopLossPrice = this.calculateStopLoss(position, riskLimits.max_single_trade_loss);
        const takeProfitPrice = this.calculateTakeProfit(position, stopLossPrice);

        // Apply stops via MT5 API (simplified)
        const { container } = await import('../di');
        const liveTradingService = container.resolve('LiveTradingService') as LiveTradingService;
        await liveTradingService.modifyPosition(position.ticket, stopLossPrice, takeProfitPrice);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error applying auto stops:', error);
      return false;
    }
  }

  async calculateVaR(positions: MT5Position[], confidence: number = 0.95): Promise<number> {
    // Simplified VaR calculation using historical volatility
    let totalVaR = 0;

    for (const position of positions) {
      const positionValue = position.volume * position.price_open;
      // Assume 1% daily volatility (simplified)
      const dailyVolatility = 0.01;
      const zScore = confidence === 0.95 ? 1.645 : confidence === 0.99 ? 2.326 : 1.96;
      const positionVaR = positionValue * dailyVolatility * zScore;
      totalVaR += positionVaR;
    }

    return totalVaR;
  }

  async getRiskMetrics(userId: string): Promise<{
    totalExposure: number;
    marginUtilization: number;
    dailyPnL: number;
    riskScore: number;
  }> {
    const cacheKey = `risk_metrics:${userId}`;
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const positionsResult = await mt5Service.getPositions();
    const accountInfo = await mt5Service.getAccountInfo();

    if (!accountInfo.success || !accountInfo.data) {
      throw new Error('Unable to retrieve account information');
    }

    const { equity, margin, profit } = accountInfo.data;

    let totalExposure = 0;
    if (positionsResult.success && positionsResult.data) {
      totalExposure = positionsResult.data.reduce(
        (sum, pos) => sum + (pos.volume * pos.price_open), 0
      );
    }

    const marginUtilization = margin > 0 ? (margin / equity) * 100 : 0;

    // Simplified risk score calculation (0-100, higher is riskier)
    const exposureRisk = Math.min((totalExposure / equity) * 50, 50);
    const marginRisk = Math.min(marginUtilization * 0.5, 25);
    const drawdown = await this.monitorDrawdown(userId);
    const drawdownRisk = Math.min(drawdown.currentDrawdown * 2, 25);

    const riskScore = exposureRisk + marginRisk + drawdownRisk;

    const metrics = {
      totalExposure,
      marginUtilization,
      dailyPnL: profit,
      riskScore,
    };

    this.cache.set(cacheKey, metrics, 60000); // 1 minute
    return metrics;
  }

  async emergencyStop(userId: string, reason: string): Promise<{ closedPositions: number; totalLoss: number }> {
    console.warn(`Emergency stop triggered for user ${userId}: ${reason}`);

    const positionsResult = await mt5Service.getPositions();
    if (!positionsResult.success || !positionsResult.data) {
      return { closedPositions: 0, totalLoss: 0 };
    }

    let closedPositions = 0;
    let totalLoss = 0;

    // Close all positions
    for (const position of positionsResult.data) {
      try {
        const closeResult = await mt5Service.closePosition(position.ticket);
        if (closeResult.success) {
          closedPositions++;
          totalLoss += position.profit; // Current unrealized P&L becomes realized loss
        }
      } catch (error) {
        console.error(`Failed to close position ${position.ticket}:`, error);
      }
    }

    return { closedPositions, totalLoss };
  }

  private async assessPositionRisk(position: MT5Position, accountEquity: number): Promise<PositionRisk> {
    const exposure = position.volume * position.price_open;
    const riskPercentage = (exposure / accountEquity) * 100;

    // Calculate stop loss distance
    const stopLossDistance = position.sl > 0 ?
      Math.abs(position.price_current - position.sl) / position.price_current : 0;

    // Calculate take profit distance
    const takeProfitDistance = position.tp > 0 ?
      Math.abs(position.price_current - position.tp) / position.price_current : 0;

    // Calculate max drawdown (simplified)
    const maxDrawdown = Math.abs(position.price_current - position.price_open) / position.price_open;

    // Correlation risk (placeholder)
    const correlationRisk = Math.random() * 30;

    return {
      position_id: position.ticket.toString(),
      symbol: position.symbol,
      exposure,
      unrealized_pnl: position.profit,
      risk_percentage: riskPercentage,
      max_drawdown: maxDrawdown * 100,
      stop_loss_distance: stopLossDistance * 100,
      take_profit_distance: takeProfitDistance * 100,
      correlation_risk: correlationRisk,
    };
  }

  private getHistoricalMaxDrawdown(userId: string): number {
    // In real implementation, calculate from historical account data
    // For now, return a mock value
    return 3.5; // 3.5% historical max drawdown
  }

  private calculateStopLoss(position: MT5Position, maxLossPercent: number): number {
    const lossAmount = (position.volume * position.price_open) * (maxLossPercent / 100);
    const pipValue = 0.0001; // Simplified for forex
    const stopPips = lossAmount / (position.volume * pipValue);

    if (position.type === 'buy') {
      return position.price_open - (stopPips * pipValue);
    } else {
      return position.price_open + (stopPips * pipValue);
    }
  }

  private calculateTakeProfit(position: MT5Position, stopLoss: number): number {
    const riskAmount = Math.abs(position.price_open - stopLoss);
    const rewardRatio = 2; // Risk:Reward ratio of 1:2

    if (position.type === 'buy') {
      return position.price_open + (riskAmount * rewardRatio);
    } else {
      return position.price_open - (riskAmount * rewardRatio);
    }
  }
}