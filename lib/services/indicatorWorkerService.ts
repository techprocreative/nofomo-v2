// Service for managing indicator calculation Web Workers
// Provides interface for spawning, monitoring, and terminating workers

export class IndicatorWorkerService {
  private workers: Map<string, Worker> = new Map();
  private workerPromises: Map<string, Promise<any>> = new Map();

  // Spawn a new worker for indicator calculations
  spawnWorker(workerId: string): Worker {
    if (this.workers.has(workerId)) {
      return this.workers.get(workerId)!;
    }

    const worker = new Worker('/lib/workers/indicatorWorker.js');
    this.workers.set(workerId, worker);

    // Monitor worker lifecycle
    worker.addEventListener('error', (error) => {
      console.error(`Worker ${workerId} error:`, error);
      this.terminateWorker(workerId);
    });

    worker.addEventListener('messageerror', (error) => {
      console.error(`Worker ${workerId} message error:`, error);
    });

    return worker;
  }

  // Calculate indicator using worker
  async calculateIndicator(
    workerId: string,
    type: 'rsi' | 'macd' | 'bollinger',
    data: any
  ): Promise<any> {
    const worker = this.spawnWorker(workerId);

    return new Promise((resolve, reject) => {
      const messageHandler = (e: MessageEvent) => {
        worker.removeEventListener('message', messageHandler);
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({ type, data });
    });
  }

  // Terminate a specific worker
  terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      this.workerPromises.delete(workerId);
    }
  }

  // Terminate all workers
  terminateAll(): void {
    this.workers.forEach((worker, workerId) => {
      worker.terminate();
    });
    this.workers.clear();
    this.workerPromises.clear();
  }

  // Get worker status
  getWorkerStatus(workerId: string): boolean {
    return this.workers.has(workerId);
  }

  // Get active worker count
  getActiveWorkerCount(): number {
    return this.workers.size;
  }
}

// Singleton instance
export const indicatorWorkerService = new IndicatorWorkerService();