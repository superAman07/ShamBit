import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface CounterMetric extends MetricData {
  type: 'counter';
}

export interface GaugeMetric extends MetricData {
  type: 'gauge';
}

export interface HistogramMetric extends MetricData {
  type: 'histogram';
  buckets?: number[];
}

export interface TimerMetric {
  name: string;
  tags?: Record<string, string>;
}

@Injectable()
export class MetricsService {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly metrics: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'api-nestjs');
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(
    name: string,
    value = 1,
    tags?: Record<string, string>,
  ): void {
    const metric: CounterMetric = {
      type: 'counter',
      name,
      value,
      tags: this.addDefaultTags(tags),
      timestamp: new Date(),
    };

    this.recordMetric(metric);
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const metric: GaugeMetric = {
      type: 'gauge',
      name,
      value,
      tags: this.addDefaultTags(tags),
      timestamp: new Date(),
    };

    this.recordMetric(metric);
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
    buckets?: number[],
  ): void {
    const metric: HistogramMetric = {
      type: 'histogram',
      name,
      value,
      tags: this.addDefaultTags(tags),
      buckets,
      timestamp: new Date(),
    };

    this.recordMetric(metric);
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, tags?: Record<string, string>): TimerMetric {
    return {
      name,
      tags: this.addDefaultTags(tags),
    };
  }

  /**
   * End a timer and record the duration
   */
  endTimer(timer: TimerMetric, startTime: number): void {
    const duration = Date.now() - startTime;
    this.recordHistogram(timer.name, duration, timer.tags);
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' = 'counter',
    tags?: Record<string, string>,
  ): void {
    const businessTags = {
      ...tags,
      metric_type: 'business',
    };

    switch (type) {
      case 'counter':
        this.incrementCounter(name, value, businessTags);
        break;
      case 'gauge':
        this.setGauge(name, value, businessTags);
        break;
      case 'histogram':
        this.recordHistogram(name, value, businessTags);
        break;
    }
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    const tags = {
      method,
      endpoint,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
      ...(userId && { user_id: userId }),
    };

    // Request count
    this.incrementCounter('api.requests.total', 1, tags);

    // Request duration
    this.recordHistogram('api.requests.duration', duration, tags);

    // Error count
    if (statusCode >= 400) {
      this.incrementCounter('api.requests.errors', 1, tags);
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
  ): void {
    const tags = {
      operation,
      table,
      success: success.toString(),
    };

    this.incrementCounter('database.queries.total', 1, tags);
    this.recordHistogram('database.queries.duration', duration, tags);

    if (!success) {
      this.incrementCounter('database.queries.errors', 1, tags);
    }
  }

  /**
   * Record external service call metrics
   */
  recordExternalCall(
    service: string,
    operation: string,
    statusCode: number,
    duration: number,
  ): void {
    const tags = {
      service,
      operation,
      status_code: statusCode.toString(),
      success: (statusCode >= 200 && statusCode < 300).toString(),
    };

    this.incrementCounter('external.calls.total', 1, tags);
    this.recordHistogram('external.calls.duration', duration, tags);

    if (statusCode >= 400) {
      this.incrementCounter('external.calls.errors', 1, tags);
    }
  }

  /**
   * Record order metrics
   */
  recordOrderMetrics(
    event: 'created' | 'paid' | 'cancelled' | 'delivered',
    amount?: number,
    sellerId?: string,
    categoryId?: string,
  ): void {
    const tags = {
      event,
      ...(sellerId && { seller_id: sellerId }),
      ...(categoryId && { category_id: categoryId }),
    };

    this.incrementCounter('orders.events', 1, tags);

    if (amount !== undefined) {
      this.recordHistogram('orders.amount', amount, tags);
    }
  }

  /**
   * Record inventory metrics
   */
  recordInventoryMetrics(
    event: 'stock_updated' | 'low_stock' | 'out_of_stock',
    variantId: string,
    sellerId: string,
    quantity?: number,
  ): void {
    const tags = {
      event,
      variant_id: variantId,
      seller_id: sellerId,
    };

    this.incrementCounter('inventory.events', 1, tags);

    if (quantity !== undefined) {
      this.setGauge('inventory.quantity', quantity, tags);
    }
  }

  /**
   * Record user activity metrics
   */
  recordUserActivity(
    action: 'login' | 'register' | 'logout' | 'view_product' | 'add_to_cart',
    userId: string,
    metadata?: Record<string, string>,
  ): void {
    const tags = {
      action,
      user_id: userId,
      ...metadata,
    };

    this.incrementCounter('user.activity', 1, tags);
  }

  /**
   * Record system health metrics
   */
  recordSystemHealth(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime?: number,
  ): void {
    const tags = {
      component,
      status,
    };

    this.setGauge('system.health', status === 'healthy' ? 1 : 0, tags);

    if (responseTime !== undefined) {
      this.recordHistogram('system.health.response_time', responseTime, tags);
    }
  }

  /**
   * Get current metric values (for debugging/monitoring)
   */
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  private recordMetric(
    metric: CounterMetric | GaugeMetric | HistogramMetric,
  ): void {
    // In development, log metrics to console
    if (this.environment === 'development') {
      console.log(
        `[METRIC] ${metric.type.toUpperCase()}: ${metric.name} = ${metric.value}`,
        metric.tags,
      );
    }

    // Store metric for potential export
    const key = `${metric.name}_${JSON.stringify(metric.tags || {})}`;
    this.metrics.set(key, metric);

    // In production, you would send these to your metrics backend:
    // - Prometheus
    // - DataDog
    // - New Relic
    // - CloudWatch
    // - Custom metrics endpoint
  }

  private addDefaultTags(
    tags?: Record<string, string>,
  ): Record<string, string> {
    return {
      service: this.serviceName,
      environment: this.environment,
      ...tags,
    };
  }
}
