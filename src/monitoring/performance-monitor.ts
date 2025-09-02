export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalOperations: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  slowestOperations: PerformanceMetrics[];
  operationBreakdown: Map<string, OperationStats>;
}

export interface OperationStats {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successCount: number;
  failureCount: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 10000;
  private enabled: boolean = true;
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }
  
  /**
   * Start timing an operation
   */
  startOperation(operation: string): () => void {
    if (!this.enabled) {
      return () => {};
    }
    
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      this.recordMetric({
        operation,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
        success,
        metadata
      });
    };
  }
  
  /**
   * Wrap an async function with performance monitoring
   */
  async monitorAsync<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }
    
    const startTime = performance.now();
    let success = true;
    let result: T;
    
    try {
      result = await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      this.recordMetric({
        operation,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
        success
      });
    }
    
    return result;
  }
  
  /**
   * Wrap a sync function with performance monitoring
   */
  monitor<T>(
    operation: string,
    fn: () => T
  ): T {
    if (!this.enabled) {
      return fn();
    }
    
    const startTime = performance.now();
    let success = true;
    let result: T;
    
    try {
      result = fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      this.recordMetric({
        operation,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString(),
        success
      });
    }
    
    return result;
  }
  
  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Limit memory usage
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  /**
   * Generate performance report
   */
  generateReport(since?: Date): PerformanceReport {
    let metrics = this.metrics;
    
    if (since) {
      metrics = metrics.filter(m => new Date(m.timestamp) >= since);
    }
    
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        slowestOperations: [],
        operationBreakdown: new Map()
      };
    }
    
    // Calculate basic stats
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;
    
    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    // Find slowest operations
    const slowest = [...metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // Break down by operation
    const breakdown = new Map<string, OperationStats>();
    
    for (const metric of metrics) {
      const stats = breakdown.get(metric.operation) || {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        successCount: 0,
        failureCount: 0
      };
      
      stats.count++;
      stats.totalDuration += metric.duration;
      stats.minDuration = Math.min(stats.minDuration, metric.duration);
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
      
      if (metric.success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }
      
      stats.averageDuration = stats.totalDuration / stats.count;
      
      breakdown.set(metric.operation, stats);
    }
    
    return {
      totalOperations: metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      successRate: (successCount / metrics.length) * 100,
      slowestOperations: slowest,
      operationBreakdown: breakdown
    };
  }
  
  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }
  
  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
  
  /**
   * Import metrics from JSON
   */
  importMetrics(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.metrics = imported;
      }
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }
  
  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }
  
  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Global instance for easy access
export const globalMonitor = new PerformanceMonitor();