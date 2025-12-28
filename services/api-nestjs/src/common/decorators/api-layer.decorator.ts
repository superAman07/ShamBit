import { SetMetadata } from '@nestjs/common';

export enum ApiLayer {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  ADMIN = 'admin',
  PARTNER = 'partner',
}

export const API_LAYER_KEY = 'apiLayer';
export const ApiLayerAccess = (layer: ApiLayer) => SetMetadata(API_LAYER_KEY, layer);

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (limit: number, windowMs: number = 60000) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

export const API_KEY_REQUIRED_KEY = 'apiKeyRequired';
export const ApiKeyRequired = () => SetMetadata(API_KEY_REQUIRED_KEY, true);