import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  tags?: Record<string, any>;
  logs?: TraceLog[];
}

export interface TraceLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, any>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'ok' | 'error' | 'timeout';
}

@Injectable()
export class TracingService {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly activeSpans: Map<string, TraceContext> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'api-nestjs');
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, tags?: Record<string, any>): TraceContext {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    
    const context: TraceContext = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        service: this.serviceName,
        environment: this.environment,
        ...tags,
      },
      logs: [],
    };

    this.activeSpans.set(spanId, context);
    return context;
  }

  /**
   * Start a child span
   */
  startSpan(
    operationName: string,
    parentContext: TraceContext,
    tags?: Record<string, any>,
  ): TraceContext {
    const spanId = this.generateSpanId();
    
    const context: TraceContext = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        service: this.serviceName,
        environment: this.environment,
        ...tags,
      },
      logs: [],
    };

    this.activeSpans.set(spanId, context);
    return context;
  }

  /**
   * Finish a span
   */
  finishSpan(
    context: TraceContext,
    status: 'ok' | 'error' | 'timeout' = 'ok',
    finalTags?: Record<string, any>,
  ): Span {
    const endTime = Date.now();
    const duration = endTime - context.startTime;

    const span: Span = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName: context.operationName,
      startTime: context.startTime,
      endTime,
      duration,
      tags: {
        ...context.tags,
        ...finalTags,
      },
      logs: context.logs || [],
      status,
    };

    // Remove from active spans
    this.activeSpans.delete(context.spanId);

    // Send to tracing backend
    this.sendSpan(span);

    return span;
  }

  /**
   * Add tags to a span
   */
  setTags(context: TraceContext, tags: Record<string, any>): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Add a log entry to a span
   */
  log(
    context: TraceContext,
    level: 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, any>,
  ): void {
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.logs = span.logs || [];
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields,
      });
    }
  }

  /**
   * Trace an HTTP request
   */
  traceHttpRequest(
    method: string,
    url: string,
    statusCode?: number,
    userId?: string,
    correlationId?: string,
  ): TraceContext {
    const context = this.startTrace('http_request', {
      'http.method': method,
      'http.url': url,
      'http.status_code': statusCode,
      'user.id': userId,
      'correlation.id': correlationId,
    });

    return context;
  }

  /**
   * Trace a database operation
   */
  traceDatabaseOperation(
    operation: string,
    table: string,
    query?: string,
    parentContext?: TraceContext,
  ): TraceContext {
    const operationName = `db.${operation}`;
    
    const context = parentContext
      ? this.startSpan(operationName, parentContext)
      : this.startTrace(operationName);

    this.setTags(context, {
      'db.type': 'postgresql',
      'db.operation': operation,
      'db.table': table,
      'db.statement': query ? this.sanitizeQuery(query) : undefined,
    });

    return context;
  }

  /**
   * Trace an external service call
   */
  traceExternalCall(
    service: string,
    operation: string,
    url?: string,
    parentContext?: TraceContext,
  ): TraceContext {
    const operationName = `external.${service}.${operation}`;
    
    const context = parentContext
      ? this.startSpan(operationName, parentContext)
      : this.startTrace(operationName);

    this.setTags(context, {
      'external.service': service,
      'external.operation': operation,
      'external.url': url,
    });

    return context;
  }

  /**
   * Trace a business operation
   */
  traceBusinessOperation(
    domain: string,
    operation: string,
    entityId?: string,
    parentContext?: TraceContext,
  ): TraceContext {
    const operationName = `${domain}.${operation}`;
    
    const context = parentContext
      ? this.startSpan(operationName, parentContext)
      : this.startTrace(operationName);

    this.setTags(context, {
      'business.domain': domain,
      'business.operation': operation,
      'business.entity_id': entityId,
    });

    return context;
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];
    const parentSpanId = headers['x-parent-span-id'];

    if (!traceId || !spanId) {
      return null;
    }

    return {
      traceId,
      spanId,
      parentSpanId,
      operationName: 'extracted_context',
      startTime: Date.now(),
      tags: {},
      logs: [],
    };
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(context: TraceContext): Record<string, string> {
    return {
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      ...(context.parentSpanId && { 'x-parent-span-id': context.parentSpanId }),
    };
  }

  /**
   * Get active spans (for debugging)
   */
  getActiveSpans(): TraceContext[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Clear all active spans (for testing)
   */
  clearActiveSpans(): void {
    this.activeSpans.clear();
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from SQL queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .substring(0, 1000); // Limit query length
  }

  private sendSpan(span: Span): void {
    // In development, log spans to console
    if (this.environment === 'development') {
      console.log(`[TRACE] ${span.operationName} (${span.duration}ms)`, {
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        status: span.status,
        tags: span.tags,
        logs: span.logs,
      });
    }

    // In production, you would send these to your tracing backend:
    // - Jaeger
    // - Zipkin
    // - DataDog APM
    // - New Relic
    // - AWS X-Ray
    // - Custom tracing endpoint
  }
}