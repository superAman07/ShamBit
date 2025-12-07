import { apiService } from './api';
import { Setting, UpdateSettingRequest } from '@/types/settings';

class SettingsService {
  async getSettings(): Promise<Setting[]> {
    const response = await apiService.getAxiosInstance().get('/settings');
    return response.data.settings;
  }

  async updateSetting(key: string, data: UpdateSettingRequest): Promise<void> {
    await apiService.getAxiosInstance().put(`/settings/${key}`, data);
  }
}

export default new SettingsService();
