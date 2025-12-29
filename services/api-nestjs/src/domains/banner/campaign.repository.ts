import { Injectable } from '@nestjs/common';

@Injectable()
export class CampaignRepository {
  async findAll(query: any) {
    return { data: [], total: 0 };
  }

  async create(data: any) {
    return { id: 'camp_1', ...data };
  }

  async findById(id: string) {
    return null;
  }
}
