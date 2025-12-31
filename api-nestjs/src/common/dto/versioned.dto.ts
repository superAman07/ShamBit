// Base classes for versioned DTOs
export abstract class VersionedDto {
  abstract readonly version: string;
}

// V1 DTOs
export namespace V1 {
  export abstract class BaseDto extends VersionedDto {
    readonly version = 'v1';
  }
}

// V2 DTOs
export namespace V2 {
  export abstract class BaseDto extends VersionedDto {
    readonly version = 'v2';
  }
}

// DTO transformation utilities
export class DtoTransformer {
  static transformToVersion<T>(data: any, targetVersion: string): T {
    switch (targetVersion) {
      case 'v1':
        return this.transformToV1(data);
      case 'v2':
        return this.transformToV2(data);
      default:
        return data;
    }
  }

  private static transformToV1(data: any): any {
    // Transform data to V1 format
    // Remove new fields, rename fields, etc.
    const { newField, renamedField, ...v1Data } = data;
    return {
      ...v1Data,
      oldFieldName: renamedField, // Map new field name to old
    };
  }

  private static transformToV2(data: any): any {
    // Transform data to V2 format
    return data; // V2 is current, no transformation needed
  }
}
