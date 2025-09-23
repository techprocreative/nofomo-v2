import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface EventData {
  type: string;
  payload?: any;
  timestamp: Date;
  source?: string;
}

export interface EventSubscription {
  id: string;
  type: string;
  callback: (event: EventData) => void;
  unsubscribe: () => void;
}

export class EventEmitterService {
  private eventSubject = new Subject<EventData>();
  private subscriptions = new Map<string, EventSubscription>();

  /**
   * Emit an event to all subscribers
   */
  emit(type: string, payload?: any, source?: string): void {
    const event: EventData = {
      type,
      payload,
      timestamp: new Date(),
      source,
    };

    this.eventSubject.next(event);
  }

  /**
   * Subscribe to events of a specific type
   */
  on(type: string, callback: (event: EventData) => void): EventSubscription {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: EventSubscription = {
      id,
      type,
      callback,
      unsubscribe: () => this.unsubscribe(id),
    };

    this.subscriptions.set(id, subscription);

    return subscription;
  }

  /**
   * Subscribe to events as an Observable
   */
  observe(type?: string): Observable<EventData> {
    if (type) {
      return this.eventSubject.pipe(
        filter(event => event.type === type)
      );
    }
    return this.eventSubject.asObservable();
  }

  /**
   * Subscribe to multiple event types
   */
  onMultiple(types: string[], callback: (event: EventData) => void): EventSubscription {
    const id = `multiple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: EventSubscription = {
      id,
      type: types.join(','),
      callback,
      unsubscribe: () => this.unsubscribe(id),
    };

    this.subscriptions.set(id, subscription);

    // Set up the observable subscription
    const observableSubscription = this.eventSubject
      .pipe(filter(event => types.includes(event.type)))
      .subscribe(callback);

    // Override unsubscribe to also unsubscribe from the observable
    subscription.unsubscribe = () => {
      observableSubscription.unsubscribe();
      this.unsubscribe(id);
    };

    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get all current subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  /**
   * Emit market data events
   */
  emitMarketData(eventType: string, symbol: string, data: any): void {
    this.emit(`market:${eventType}`, { symbol, data }, 'market-service');
  }

  /**
   * Emit trading events
   */
  emitTradingData(eventType: string, data: any): void {
    this.emit(`trading:${eventType}`, data, 'trading-service');
  }

  /**
   * Emit UI events
   */
  emitUIEvent(eventType: string, data: any): void {
    this.emit(`ui:${eventType}`, data, 'ui-component');
  }

  /**
   * Emit connection events
   */
  emitConnectionEvent(status: 'connected' | 'disconnected' | 'error', details?: any): void {
    this.emit(`connection:${status}`, details, 'connection-manager');
  }

  /**
   * Emit signal events
   */
  emitSignalEvent(signalType: 'new' | 'update' | 'expired', signal: any): void {
    this.emit(`signal:${signalType}`, signal, 'signal-service');
  }

  /**
   * Create a typed event emitter for specific domains
   */
  createDomainEmitter(domain: string) {
    return {
      emit: (type: string, payload?: any) => this.emit(`${domain}:${type}`, payload, domain),
      on: (type: string, callback: (event: EventData) => void) => this.on(`${domain}:${type}`, callback),
      observe: (type?: string) => this.observe(type ? `${domain}:${type}` : undefined),
    };
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
    recentEvents: EventData[];
  } {
    const subscriptionsByType: Record<string, number> = {};
    const recentEvents: EventData[] = [];

    for (const subscription of this.subscriptions.values()) {
      const types = subscription.type.split(',');
      types.forEach(type => {
        subscriptionsByType[type] = (subscriptionsByType[type] || 0) + 1;
      });
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByType,
      recentEvents,
    };
  }
}

// Singleton instance
export const eventEmitterService = new EventEmitterService();

// Domain-specific emitters
export const marketEvents = eventEmitterService.createDomainEmitter('market');
export const tradingEvents = eventEmitterService.createDomainEmitter('trading');
export const uiEvents = eventEmitterService.createDomainEmitter('ui');
export const connectionEvents = eventEmitterService.createDomainEmitter('connection');
export const signalEvents = eventEmitterService.createDomainEmitter('signal');