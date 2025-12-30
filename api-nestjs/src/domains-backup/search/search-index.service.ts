import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchIndexService {
  async indexEntity(entityType: string, entityId: string, data: any) {
    // TODO: Implement entity indexing
  }

  async removeEntity(entityType: string, entityId: string) {
    // TODO: Implement entity removal from index
  }

  async reindexAll() {
    // TODO: Implement full reindexing
  }

  // Backwards-compatible alias used by controller
  async triggerFullReindex() {
    return this.reindexAll();
  }
}