import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    
    // Get version metadata
    const version = this.reflector.getAllAndOverride<string>(API_VERSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get deprecation metadata
    const deprecation = this.reflector.getAllAndOverride<{
      sunsetDate?: Date;
      message?: string;
    }>(DEPRECATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Set version header
    if (version) {
      response.setHeader('API-Version', version);
    }

    // Set deprecation headers
    if (deprecation) {
      response.setHeader('Deprecated', 'true');
      if (deprecation.sunsetDate) {
        response.setHeader('Sunset', deprecation.sunsetDate.toISOString());
      }
      if (deprecation.message) {
        response.setHeader('Deprecation-Message', deprecation.message);
      }
    }

    return next.handle().pipe(
      map((data) => {
        // Add version info to response body if needed
        if (data && typeof data === 'object') {
          const body = data as Record<string, any>;
          const existingMeta = (body._meta || {}) as Record<string, any>;
          return {
            ...body,
            _meta: {
              ...existingMeta,
              apiVersion: version,
              deprecated: !!deprecation,
            },
          };
        }
        return data;
      }),
    );
  }
}