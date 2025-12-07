export interface Setting {
  key: string;
  value: string;
  description: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
}

export interface UpdateSettingRequest {
  value: string;
  description?: string;
  valueType?: string;
}
