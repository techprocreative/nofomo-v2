import { NextRequest } from 'next/server';
import { WebSocket } from 'ws';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { realTimeDataService, defaultRealTimeDataConfig } from '../../../../lib/services/realTimeDataService';
import { eventEmitterService } from '../../../../lib/services/eventEmitterService';

// Store active WebSocket connections
const activeConnections = new Map<string, WebSocket>();

// WebSocketPair for Next.js compatibility
declare const WebSocketPair: any;

// Message types for the stream
export interface StreamMessage {
  type: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

// Handle WebSocket upgrade
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return new Response('User ID not found', { status: 401 });
    }

    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Handle WebSocket upgrade
    const response = new Response(null, { status: 101 }) as any;
    response.webSocket = handleWebSocketConnection(userId);

    return response;
  } catch (error) {
    console.error('WebSocket upgrade failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function handleWebSocketConnection(userId: string): WebSocket {
  // Create WebSocket pair for Next.js
  const { 0: client, 1: server } = new WebSocketPair();

  // Handle server-side WebSocket
  const ws = server as any; // Next.js WebSocket type

  // Generate unique connection ID
  const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  activeConnections.set(connectionId, ws);

  // Connection opened
  ws.addEventListener('open', () => {
    console.log(`WebSocket connection opened: ${connectionId}`);

    // Send welcome message
    sendMessage(ws, {
      type: 'connection_status',
      data: { status: 'connected', connectionId },
      timestamp: new Date(),
    });

    // Subscribe to real-time events for this user
    setupEventSubscriptions(connectionId, userId);
  });

  // Handle incoming messages
  ws.addEventListener('message', (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data.toString());
      handleClientMessage(connectionId, userId, message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: new Date(),
      });
    }
  });

  // Handle connection close
  ws.addEventListener('close', () => {
    console.log(`WebSocket connection closed: ${connectionId}`);
    activeConnections.delete(connectionId);
    cleanupEventSubscriptions(connectionId);
  });

  // Handle errors
  ws.addEventListener('error', (error: Event) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    sendMessage(ws, {
      type: 'error',
      data: { message: 'Connection error occurred' },
      timestamp: new Date(),
    });
  });

  return client;
}

function handleClientMessage(connectionId: string, userId: string, message: any) {
  const { type, data, correlationId } = message;

  switch (type) {
    case 'subscribe':
      handleSubscription(connectionId, userId, data, correlationId);
      break;

    case 'unsubscribe':
      handleUnsubscription(connectionId, data, correlationId);
      break;

    case 'ping':
      // Respond to ping with pong
      const pingWs = activeConnections.get(connectionId);
      if (pingWs) {
        sendMessage(pingWs, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: new Date(),
          correlationId,
        });
      }
      break;

    default:
      console.warn(`Unknown message type: ${type}`);
      const defaultWs = activeConnections.get(connectionId);
      if (defaultWs) {
        sendMessage(defaultWs, {
          type: 'error',
          data: { message: `Unknown message type: ${type}` },
          timestamp: new Date(),
          correlationId,
        });
      }
  }
}

function handleSubscription(connectionId: string, userId: string, data: any, correlationId?: string) {
  const { symbols = [], eventTypes = ['price_update'] } = data;
  const ws = activeConnections.get(connectionId);

  if (!ws) return;

  try {
    // Subscribe to symbols
    symbols.forEach((symbol: string) => {
      if (eventTypes.includes('price_update')) {
        realTimeDataService.subscribeToPrices(symbol);
      }
      if (eventTypes.includes('depth_update')) {
        realTimeDataService.subscribeToDepth(symbol);
      }
      if (eventTypes.includes('ohlc_update')) {
        // Subscribe to multiple timeframes
        ['1m', '5m', '15m', '1h'].forEach(timeframe => {
          realTimeDataService.subscribeToOHLC(symbol, timeframe);
        });
      }
    });

    sendMessage(ws, {
      type: 'subscription_success',
      data: { symbols, eventTypes },
      timestamp: new Date(),
      correlationId,
    });
  } catch (error) {
    console.error('Subscription failed:', error);
    sendMessage(ws, {
      type: 'error',
      data: { message: 'Subscription failed', details: (error as Error).message },
      timestamp: new Date(),
      correlationId,
    });
  }
}

function handleUnsubscription(connectionId: string, data: any, correlationId?: string) {
  const { symbols = [], eventTypes = ['price_update'] } = data;
  const ws = activeConnections.get(connectionId);

  if (!ws) return;

  try {
    // Unsubscribe from symbols
    symbols.forEach((symbol: string) => {
      if (eventTypes.includes('price_update')) {
        realTimeDataService.unsubscribeFromPrices(symbol);
      }
      if (eventTypes.includes('depth_update')) {
        realTimeDataService.unsubscribeFromDepth(symbol);
      }
      if (eventTypes.includes('ohlc_update')) {
        ['1m', '5m', '15m', '1h'].forEach(timeframe => {
          realTimeDataService.unsubscribeFromOHLC(symbol, timeframe);
        });
      }
    });

    sendMessage(ws, {
      type: 'unsubscription_success',
      data: { symbols, eventTypes },
      timestamp: new Date(),
      correlationId,
    });
  } catch (error) {
    console.error('Unsubscription failed:', error);
    sendMessage(ws, {
      type: 'error',
      data: { message: 'Unsubscription failed', details: (error as Error).message },
      timestamp: new Date(),
      correlationId,
    });
  }
}

function setupEventSubscriptions(connectionId: string, userId: string) {
  // Subscribe to market data events
  const marketSubscription = eventEmitterService.observe('market:*').subscribe(event => {
    const ws = activeConnections.get(connectionId);
    if (ws) {
      sendMessage(ws, {
        type: event.type,
        data: event.payload,
        timestamp: event.timestamp,
      });
    }
  });

  // Subscribe to trading events (filtered by user)
  const tradingSubscription = eventEmitterService.observe('trading:*').subscribe(event => {
    // Only send trading events for this user
    if (event.payload?.userId === userId) {
      const ws = activeConnections.get(connectionId);
      if (ws) {
        sendMessage(ws, {
          type: event.type,
          data: event.payload,
          timestamp: event.timestamp,
        });
      }
    }
  });

  // Subscribe to signal events
  const signalSubscription = eventEmitterService.observe('signal:*').subscribe(event => {
    const ws = activeConnections.get(connectionId);
    if (ws) {
      sendMessage(ws, {
        type: event.type,
        data: event.payload,
        timestamp: event.timestamp,
      });
    }
  });

  // Subscribe to notification events
  const notificationSubscription = eventEmitterService.observe('notification:*').subscribe(event => {
    const ws = activeConnections.get(connectionId);
    if (ws) {
      sendMessage(ws, {
        type: event.type,
        data: event.payload,
        timestamp: event.timestamp,
      });
    }
  });

  // Store subscriptions for cleanup
  (globalThis as any).eventSubscriptions = (globalThis as any).eventSubscriptions || new Map();
  (globalThis as any).eventSubscriptions.set(connectionId, [
    marketSubscription,
    tradingSubscription,
    signalSubscription,
    notificationSubscription,
  ]);
}

function cleanupEventSubscriptions(connectionId: string) {
  const subscriptions = (globalThis as any).eventSubscriptions?.get(connectionId);
  if (subscriptions) {
    subscriptions.forEach((sub: any) => sub.unsubscribe());
    (globalThis as any).eventSubscriptions.delete(connectionId);
  }
}

function sendMessage(ws: WebSocket, message: StreamMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Initialize the real-time data service
if (typeof globalThis !== 'undefined') {
  (globalThis as any).realTimeDataService = realTimeDataService;
  // Initialize service if not already done
  if (!(globalThis as any).serviceInitialized) {
    realTimeDataService.initialize().catch(console.error);
    (globalThis as any).serviceInitialized = true;
  }
}