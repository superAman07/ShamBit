import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { NotificationType } from './notification.service.js';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
}

@Injectable()
export class NotificationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplate(
    type: NotificationType,
  ): Promise<NotificationTemplate | null> {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        type,
        isActive: true,
      },
    });

    if (!template) {
      return this.getDefaultTemplate(type);
    }

    return {
      id: template.id,
      type: template.type as NotificationType,
      title: template.title,
      message: template.message,
      variables: template.variables as string[],
    };
  }

  private getDefaultTemplate(type: NotificationType): NotificationTemplate {
    const templates: Record<
      NotificationType,
      Omit<NotificationTemplate, 'id'>
    > = {
      [NotificationType.ORDER_CONFIRMATION]: {
        type: NotificationType.ORDER_CONFIRMATION,
        title: 'Order Confirmed',
        message:
          'Your order {{orderNumber}} has been confirmed and is being processed.',
        variables: ['orderNumber', 'customerName', 'totalAmount'],
      },
      [NotificationType.ORDER_SHIPPED]: {
        type: NotificationType.ORDER_SHIPPED,
        title: 'Order Shipped',
        message:
          'Your order {{orderNumber}} has been shipped. Track your package with {{trackingNumber}}.',
        variables: ['orderNumber', 'trackingNumber', 'customerName'],
      },
      [NotificationType.ORDER_DELIVERED]: {
        type: NotificationType.ORDER_DELIVERED,
        title: 'Order Delivered',
        message: 'Your order {{orderNumber}} has been delivered successfully.',
        variables: ['orderNumber', 'customerName'],
      },
      [NotificationType.ORDER_CANCELLED]: {
        type: NotificationType.ORDER_CANCELLED,
        title: 'Order Cancelled',
        message: 'Your order {{orderNumber}} has been cancelled. {{reason}}',
        variables: ['orderNumber', 'reason', 'customerName'],
      },
      [NotificationType.PAYMENT_SUCCESS]: {
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message:
          'Payment of {{amount}} for order {{orderNumber}} was successful.',
        variables: ['amount', 'orderNumber', 'customerName'],
      },
      [NotificationType.PAYMENT_FAILED]: {
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: 'Payment for order {{orderNumber}} failed. Please try again.',
        variables: ['orderNumber', 'customerName', 'reason'],
      },
      [NotificationType.PRODUCT_APPROVED]: {
        type: NotificationType.PRODUCT_APPROVED,
        title: 'Product Approved',
        message:
          'Your product "{{productName}}" has been approved and is now live.',
        variables: ['productName', 'sellerName'],
      },
      [NotificationType.PRODUCT_REJECTED]: {
        type: NotificationType.PRODUCT_REJECTED,
        title: 'Product Rejected',
        message: 'Your product "{{productName}}" was rejected. {{reason}}',
        variables: ['productName', 'reason', 'sellerName'],
      },
      [NotificationType.LOW_STOCK_ALERT]: {
        type: NotificationType.LOW_STOCK_ALERT,
        title: 'Low Stock Alert',
        message:
          'Product "{{productName}}" is running low on stock ({{currentStock}} remaining).',
        variables: ['productName', 'currentStock', 'sellerName'],
      },
      [NotificationType.SELLER_APPLICATION_APPROVED]: {
        type: NotificationType.SELLER_APPLICATION_APPROVED,
        title: 'Seller Application Approved',
        message: 'Congratulations! Your seller application has been approved.',
        variables: ['sellerName'],
      },
      [NotificationType.PROMOTION_ACTIVATED]: {
        type: NotificationType.PROMOTION_ACTIVATED,
        title: 'Promotion Active',
        message: 'Your promotion "{{promotionName}}" is now active!',
        variables: ['promotionName', 'discount', 'validUntil'],
      },
      [NotificationType.REVIEW_RECEIVED]: {
        type: NotificationType.REVIEW_RECEIVED,
        title: 'New Review',
        message: 'You received a {{rating}}-star review for "{{productName}}".',
        variables: ['rating', 'productName', 'reviewText', 'sellerName'],
      },
      [NotificationType.SYSTEM_MAINTENANCE]: {
        type: NotificationType.SYSTEM_MAINTENANCE,
        title: 'System Maintenance',
        message:
          'System maintenance scheduled from {{startTime}} to {{endTime}}.',
        variables: ['startTime', 'endTime', 'description'],
      },
    };

    return {
      id: `default-${type}`,
      ...templates[type],
    };
  }

  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): { title: string; message: string } {
    let title = template.title;
    let message = template.message;

    // Replace variables in title and message
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return { title, message };
  }
}
