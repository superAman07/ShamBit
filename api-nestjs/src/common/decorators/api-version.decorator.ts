import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const ApiVersion = (version: string) =>
  SetMetadata(API_VERSION_KEY, version);

export const DEPRECATED_KEY = 'deprecated';
export const Deprecated = (sunsetDate?: Date, message?: string) =>
  SetMetadata(DEPRECATED_KEY, { sunsetDate, message });

export const BACKWARD_COMPATIBLE_KEY = 'backwardCompatible';
export const BackwardCompatible = (versions: string[]) =>
  SetMetadata(BACKWARD_COMPATIBLE_KEY, versions);
