import { PriceTick, OHLCData, MarketDepth } from '../types';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

export interface CacheStats {
  memorySize: number;
  indexedDBSize: number;
  totalEntries: number;
  hitRate: number;
  evictions: number;
}

export class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private lruOrder: string[] = []; // For LRU eviction
  private indexedDB: IDBDatabase | null = null;
  private dbName = 'ForexAICache';
  private dbVersion = 1;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private maxIndexedDBSize = 500 * 1024 * 1024; // 500MB
  private evictionInterval = 300000; // 5 minutes
  private stats = {
    memorySize: 0,
    indexedDBSize: 0,
    totalEntries: 0,
    hitRate: 0,
    evictions: 0,
  };

  constructor() {
    this.initIndexedDB();
    this.startEvictionTimer();
  }

  private async initIndexedDB(): Promise<void> {
    // Check if running in browser environment and IndexedDB is available
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available, falling back to memory-only cache');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to memory-only cache');
        resolve();
      };

      request.onsuccess = (event) => {
        this.indexedDB = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  /**
   * Set data in cache with TTL
   */
  async set<T>(key: string, data: T, ttl: number = 300000): Promise<void> { // Default 5 minutes
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0,
    };

    // Memory cache with LRU eviction
    this.memoryCache.set(key, entry);

    // Update LRU order
    this.updateLRU(key);

    this.updateMemorySize();

    // Evict if memory limit exceeded
    this.evictLRUIfNeeded();

    // IndexedDB for persistence
    if (this.indexedDB) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await new Promise<void>((resolve, reject) => {
          const request = store.put({ key, ...entry });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to store in IndexedDB:', error);
      }
    }

    this.stats.totalEntries++;
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    let entry = this.memoryCache.get(key);
    if (entry && this.isValid(entry)) {
      entry.hits++;
      this.updateLRU(key); // Update LRU on access
      return entry.data;
    }

    // Try IndexedDB
    if (this.indexedDB && !entry) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const dbEntry = await new Promise<any>((resolve, reject) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (dbEntry && this.isValid(dbEntry)) {
          // Restore to memory cache
          this.memoryCache.set(key, dbEntry);
          dbEntry.hits++;
          this.updateLRU(key);
          this.updateMemorySize();
          this.evictLRUIfNeeded(); // In case restoring pushes over limit
          return dbEntry.data;
        }
      } catch (error) {
        console.warn('Failed to retrieve from IndexedDB:', error);
      }
    }

    return null;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.updateMemorySize();

    if (this.indexedDB) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to delete from IndexedDB:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.stats.memorySize = 0;

    if (this.indexedDB) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return (now - entryTime) < entry.ttl;
  }

  /**
   * Update memory cache size
   */
  private updateMemorySize(): void {
    // Rough estimation of memory usage
    this.stats.memorySize = this.memoryCache.size * 1024; // ~1KB per entry
  }

  /**
   * Start eviction timer
   */
  private startEvictionTimer(): void {
    setInterval(() => {
      this.evictExpiredEntries();
    }, this.evictionInterval);
  }

  /**
   * Evict expired entries from memory cache
   */
  private evictExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if ((now - entry.timestamp.getTime()) >= entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));
    this.stats.evictions += expiredKeys.length;
    this.updateMemorySize();
  }

  /**
   * Preload common symbols data
   */
  async preloadCommonSymbols(symbols: string[]): Promise<void> {
    const commonKeys = symbols.flatMap(symbol => [
      `price:${symbol}`,
      `depth:${symbol}`,
      `ohlc:${symbol}:5m`,
      `ohlc:${symbol}:1h`,
    ]);

    // Preload from IndexedDB to memory
    if (this.indexedDB) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');

        for (const key of commonKeys) {
          const dbEntry = await new Promise<any>((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (dbEntry && this.isValid(dbEntry)) {
            this.memoryCache.set(key, dbEntry);
          }
        }

        this.updateMemorySize();
      } catch (error) {
        console.warn('Failed to preload common symbols:', error);
      }
    }
  }

  /**
   * Get cache keys matching pattern
   */
  async getKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];

    // Memory cache keys
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        keys.push(key);
      }
    }

    // IndexedDB keys
    if (this.indexedDB) {
      try {
        const transaction = this.indexedDB.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.getAllKeys();

        const dbKeys = await new Promise<string[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result as string[]);
          request.onerror = () => reject(request.error);
        });

        keys.push(...dbKeys.filter(key => key.includes(pattern)));
      } catch (error) {
        console.warn('Failed to get IndexedDB keys:', error);
      }
    }

    return [...new Set(keys)]; // Remove duplicates
  }

  /**
   * Update LRU order for a key
   */
  private updateLRU(key: string): void {
    // Remove if already exists
    const index = this.lruOrder.indexOf(key);
    if (index > -1) {
      this.lruOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.lruOrder.push(key);
  }

  /**
   * Evict least recently used entries if memory limit exceeded
   */
  private evictLRUIfNeeded(): void {
    while (this.stats.memorySize > this.maxMemorySize && this.lruOrder.length > 0) {
      const lruKey = this.lruOrder.shift(); // Remove least recently used
      if (lruKey && this.memoryCache.has(lruKey)) {
        this.memoryCache.delete(lruKey);
        this.stats.evictions++;
      }
    }
    this.updateMemorySize();
  }
}

// Singleton instance
export const cacheService = new CacheService();