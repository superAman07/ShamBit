import { Injectable } from '@nestjs/common';
import { OrderItemRepository } from './repositories/order-item.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

@Injectable()
export class OrderItemService {
  constructor(
    private readonly orderItemRepository: OrderItemRepository,
    private readonly logger: LoggerService,
  ) {}

  async createOrderItem(data: any) {
    this.logger.log('OrderItemService.createOrderItem', data);
    return this.orderItemRepository.create(data);
  }

  async findByOrderId(orderId: string) {
    return this.orderItemRepository.findByOrderId(orderId);
  }
}
