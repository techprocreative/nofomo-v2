import { useRealtimeDataStore } from '../stores/realtimeDataStore';
import { useUIStateStore } from '../stores/uiStateStore';
import { eventEmitterService } from './eventEmitterService';

export interface NotificationRule {
  id: string;
  name: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: 'browser' | 'email' | 'sms' | 'sound';
    enabled: boolean;
    config?: any;
  }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export class NotificationService {
  private audioContext: AudioContext | null = null;
  private soundBuffers = new Map<string, AudioBuffer>();
  private notificationQueue: Alert[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAudio();
    this.startProcessing();
  }

  private async initializeAudio(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSoundBuffers();
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  private async loadSoundBuffers(): Promise<void> {
    if (!this.audioContext) return;

    // Load default notification sounds
    const soundUrls = {
      'alert-critical': '/sounds/alert-critical.mp3',
      'alert-high': '/sounds/alert-high.mp3',
      'alert-medium': '/sounds/alert-medium.mp3',
      'alert-low': '/sounds/alert-low.mp3',
    };

    for (const [key, url] of Object.entries(soundUrls)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.soundBuffers.set(key, buffer);
      } catch (error) {
        console.warn(`Failed to load sound ${key}:`, error);
        // Create synthetic tones as fallback
        this.soundBuffers.set(key, this.createSyntheticTone(key));
      }
    }
  }

  private createSyntheticTone(type: string): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');

    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);

    const channelData = buffer.getChannelData(0);

    // Generate tone based on severity
    const frequencies = {
      'alert-critical': 800,
      'alert-high': 600,
      'alert-medium': 400,
      'alert-low': 300,
    };

    const frequency = frequencies[type as keyof typeof frequencies] || 400;

    for (let i = 0; i < frameCount; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      // Add fade out
      const fadeOut = Math.max(0, (frameCount - i) / frameCount);
      channelData[i] *= fadeOut;
    }

    return buffer;
  }

  private startProcessing(): void {
    // Process notifications every 100ms for low latency
    this.processingInterval = setInterval(() => {
      this.processNotifications();
    }, 100);
  }

  private processNotifications(): void {
    const rules = useUIStateStore.getState().notificationRules;
    const enabledRules = rules.filter(rule => rule.enabled);

    if (enabledRules.length === 0) return;

    // Get current market data
    const prices = useRealtimeDataStore.getState().prices;
    const signals = useRealtimeDataStore.getState().signals;
    const positions = useRealtimeDataStore.getState().positions;

    for (const rule of enabledRules) {
      if (this.evaluateRule(rule, { prices, signals, positions })) {
        this.triggerAlert(rule);
      }
    }
  }

  private evaluateRule(rule: NotificationRule, data: any): boolean {
    const { conditions } = rule;
    let result = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);

      if (i === 0) {
        result = conditionResult;
      } else {
        const logic = condition.logic || 'AND';
        if (logic === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }

    return result;
  }

  private evaluateCondition(condition: NotificationRule['conditions'][0], data: any): boolean {
    const { field, operator, value } = condition;

    // Parse field path (e.g., "prices.EURUSD.bid", "signals.0.strength")
    const fieldValue = this.getFieldValue(field, data);

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < value;
      case 'greater_equal':
        return typeof fieldValue === 'number' && fieldValue >= value;
      case 'less_equal':
        return typeof fieldValue === 'number' && fieldValue <= value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    const parts = field.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[parseInt(part)];
      } else if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private triggerAlert(rule: NotificationRule): void {
    // Prevent duplicate alerts within short time frame
    const now = Date.now();
    if (rule.lastTriggered && (now - rule.lastTriggered.getTime()) < 5000) {
      return; // Minimum 5 seconds between alerts for same rule
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      message: this.generateAlertMessage(rule),
      severity: rule.severity,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Add to history
    useUIStateStore.getState().addAlert(alert);

    // Update rule last triggered
    useUIStateStore.getState().updateNotificationRule(rule.id, {
      lastTriggered: new Date(),
    });

    // Execute actions
    for (const action of rule.actions) {
      if (action.enabled) {
        this.executeAction(action, alert);
      }
    }

    // Emit event for real-time updates
    eventEmitterService.emit('notification:triggered', {
      alert,
      rule,
    });
  }

  private generateAlertMessage(rule: NotificationRule): string {
    // Generate human-readable message based on rule conditions
    const conditions = rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ');
    return `${rule.name}: ${conditions}`;
  }

  private async executeAction(action: NotificationRule['actions'][0], alert: Alert): Promise<void> {
    switch (action.type) {
      case 'browser':
        await this.sendBrowserNotification(alert);
        break;
      case 'email':
        this.sendEmailNotification(alert);
        break;
      case 'sms':
        this.sendSMSNotification(alert);
        break;
      case 'sound':
        this.playSoundNotification(alert.severity);
        break;
    }
  }

  private async sendBrowserNotification(alert: Alert): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    const notification = new Notification(`ForexAI Alert - ${alert.severity.toUpperCase()}`, {
      body: alert.message,
      icon: '/placeholder-logo.png',
      badge: '/placeholder-logo.png',
      tag: alert.id,
      requireInteraction: alert.severity === 'critical',
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Could navigate to specific section of the app
    };

    // Auto-close after 10 seconds for non-critical alerts
    if (alert.severity !== 'critical') {
      setTimeout(() => notification.close(), 10000);
    }
  }

  private sendEmailNotification(alert: Alert): void {
    // Simulate email sending - in production, integrate with email service
    console.log(`📧 EMAIL ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`To: user@forexai.com`);
    console.log(`Subject: ForexAI Trading Alert - ${alert.severity.toUpperCase()}`);
    console.log(`Timestamp: ${alert.timestamp.toISOString()}`);
  }

  private sendSMSNotification(alert: Alert): void {
    // Simulate SMS sending - in production, integrate with SMS service
    console.log(`📱 SMS ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`To: +1234567890`);
    console.log(`Timestamp: ${alert.timestamp.toISOString()}`);
  }

  private playSoundNotification(severity: Alert['severity']): void {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      return;
    }

    const buffer = this.soundBuffers.get(`alert-${severity}`);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  public async initialize(): Promise<void> {
    await this.initializeAudio();
  }

  public destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Public methods for external control
  public testAlert(severity: Alert['severity'] = 'medium'): void {
    const testAlert: Alert = {
      id: `test_${Date.now()}`,
      ruleId: 'test',
      message: `Test ${severity} alert - ${new Date().toLocaleTimeString()}`,
      severity,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.executeAction({ type: 'browser', enabled: true }, testAlert);
    this.executeAction({ type: 'sound', enabled: true }, testAlert);
  }
}

// Singleton instance
export const notificationService = new NotificationService();