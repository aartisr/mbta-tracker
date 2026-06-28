/**
 * High-Performance Metrics Tracking
 * Measures actual performance without sacrificing accuracy
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'render' | 'network' | 'geolocation' | 'data-processing';
}

export interface DataQualityMetric {
  freshnessMs: number;
  staleness: 'fresh' | 'warm' | 'stale' | 'very-stale';
  accuracy: 'high' | 'medium' | 'low' | 'unknown';
  completeness: number; // 0-100
  errorCount: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private slowOperationThreshold = 1000; // ms

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, category: PerformanceMetric['category']) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No mark found for ${name}`);
      return;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      category,
    };

    this.metrics.push(metric);
    this.marks.delete(name);

    if (duration > this.slowOperationThreshold) {
      console.warn(`⚠ Slow ${category}: ${name} took ${Math.round(duration)}ms`);
    }

    return metric;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetric(category: PerformanceMetric['category']): number {
    const categoryMetrics = this.metrics.filter((m) => m.category === category);
    if (categoryMetrics.length === 0) return 0;
    const total = categoryMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / categoryMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
    this.marks.clear();
  }
}

class DataQualityMonitor {
  private lastUpdateTime = Date.now();
  private errorCount = 0;
  private totalDataPoints = 0;

  recordUpdate() {
    this.lastUpdateTime = Date.now();
  }

  recordError() {
    this.errorCount++;
  }

  recordDataPoint() {
    this.totalDataPoints++;
  }

  getQualityMetric(dataPoints = this.totalDataPoints): DataQualityMetric {
    const freshnessMs = Date.now() - this.lastUpdateTime;

    let staleness: DataQualityMetric['staleness'];
    if (freshnessMs < 30000) {
      staleness = 'fresh';
    } else if (freshnessMs < 60000) {
      staleness = 'warm';
    } else if (freshnessMs < 300000) {
      staleness = 'stale';
    } else {
      staleness = 'very-stale';
    }

    const completeness = dataPoints > 0 ? Math.min(100, (dataPoints / 100) * 100) : 0;

    return {
      freshnessMs,
      staleness,
      accuracy: this.inferAccuracy(freshnessMs),
      completeness,
      errorCount: this.errorCount,
    };
  }

  private inferAccuracy(freshnessMs: number): DataQualityMetric['accuracy'] {
    if (freshnessMs < 10000) return 'high';
    if (freshnessMs < 60000) return 'medium';
    if (freshnessMs < 300000) return 'low';
    return 'unknown';
  }

  reset() {
    this.lastUpdateTime = Date.now();
    this.errorCount = 0;
    this.totalDataPoints = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();
export const dataQualityMonitor = new DataQualityMonitor();

/**
 * Request deduplication cache
 * Prevents identical concurrent requests
 */
export class RequestDeduplicator {
  private activeRequests = new Map<string, Promise<any>>();

  dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    const promise = fetcher().finally(() => {
      this.activeRequests.delete(key);
    });

    this.activeRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.activeRequests.clear();
  }
}

/**
 * Error logger with categorization
 */
export class ErrorLogger {
  private errors: Array<{ message: string; category: string; timestamp: number }> = [];

  log(message: string, category: 'network' | 'geolocation' | 'data' | 'render' | 'unknown' = 'unknown') {
    this.errors.push({
      message,
      category,
      timestamp: Date.now(),
    });

    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors.shift();
    }

    console.error(`[${category.toUpperCase()}] ${message}`);
  }

  getErrors() {
    return [...this.errors];
  }

  getErrorsBy(category: string) {
    return this.errors.filter((e) => e.category === category);
  }

  clear() {
    this.errors = [];
  }
}

export const errorLogger = new ErrorLogger();
