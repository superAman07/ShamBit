import { Injectable } from '@nestjs/common';

@Injectable()
export class BannerService {
  async getActiveBanners(position?: string) {
    // TODO: implement real retrieval
    return [];
  }

  async getAllBanners(query: any) {
    // TODO: implement pagination and filtering
    return { data: [], total: 0, page: query?.page ?? 1, limit: query?.limit ?? 20 };
  }

  async findById(id: string) {
    // TODO: implement
    return null;
  }

  async createBanner(data: any, createdBy: string) {
    // TODO: implement
    return { id: 'banner_1', ...data, createdBy };
  }

  async updateBanner(id: string, data: any) {
    // TODO: implement
    return { id, ...data };
  }

  async deleteBanner(id: string) {
    // TODO: implement
    return;
  }

  async toggleBanner(id: string, isActive: boolean) {
    // TODO: implement
    return { id, isActive };
  }
}
