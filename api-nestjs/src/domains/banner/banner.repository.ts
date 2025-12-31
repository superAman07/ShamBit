import { Injectable } from '@nestjs/common';

@Injectable()
export class BannerRepository {
  async findActive(position?: string) {
    return [];
  }

  async findAll(query: any) {
    return { data: [], total: 0 };
  }

  async findById(id: string) {
    return null;
  }

  async create(data: any) {
    return { id: 'banner_1', ...data };
  }

  async update(id: string, data: any) {
    return { id, ...data };
  }

  async delete(id: string) {
    return;
  }
}
