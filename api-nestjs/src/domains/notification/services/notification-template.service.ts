import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationTemplate,
  TemplateStatus,
  NotificationCategory,
} from '../types/notification.types';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import {
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationCategory as PrismaNotificationCategory,
  TemplateStatus as PrismaTemplateStatus,
} from '@prisma/client';

export interface RenderedTemplate {
  subject?: string;
  title?: string;
  content: string;
  htmlContent?: string;
}

export interface CreateTemplateDto {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  category: NotificationCategory;
  locale?: string;
  subject?: string;
  title?: string;
  content: string;
  htmlContent?: string;
  variables: string[];
  defaultVariables?: Record<string, any>;
  tenantId?: string;
  isGlobal?: boolean;
}

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  async createTemplate(
    dto: CreateTemplateDto,
    createdBy: string,
  ): Promise<NotificationTemplate> {
    this.logger.log('Creating notification template', {
      name: dto.name,
      type: dto.type,
      channel: dto.channel,
    });

    const template = await this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        type: dto.type as PrismaNotificationType,
        channel: dto.channel as PrismaNotificationChannel,
        category: dto.category as PrismaNotificationCategory,
        locale: dto.locale || 'en',
        subject: dto.subject,
        title: dto.title,
        content: dto.content,
        htmlContent: dto.htmlContent,
        variables: dto.variables,
        defaultVariables: dto.defaultVariables || {},
        status: TemplateStatus.DRAFT as PrismaTemplateStatus,
        tenantId: dto.tenantId,
        isGlobal: dto.isGlobal || false,
        createdBy,
      },
    });

    return this.mapToTemplateType(template);
  }

  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string = 'en',
    tenantId?: string,
  ): Promise<NotificationTemplate | null> {
    // Try to find tenant-specific template first, then global
    const whereConditions = [
      {
        type: type as PrismaNotificationType,
        channel: channel as PrismaNotificationChannel,
        locale,
        status: TemplateStatus.ACTIVE as PrismaTemplateStatus,
        tenantId,
        isGlobal: false,
      },
      {
        type: type as PrismaNotificationType,
        channel: channel as PrismaNotificationChannel,
        locale,
        status: TemplateStatus.ACTIVE as PrismaTemplateStatus,
        isGlobal: true,
      },
      // Fallback to English if locale not found
      {
        type: type as PrismaNotificationType,
        channel: channel as PrismaNotificationChannel,
        locale: 'en',
        status: TemplateStatus.ACTIVE as PrismaTemplateStatus,
        tenantId,
        isGlobal: false,
      },
      {
        type: type as PrismaNotificationType,
        channel: channel as PrismaNotificationChannel,
        locale: 'en',
        status: TemplateStatus.ACTIVE as PrismaTemplateStatus,
        isGlobal: true,
      },
    ];

    for (const where of whereConditions) {
      const template = await this.prisma.notificationTemplate.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
      });

      if (template) {
        return this.mapToTemplateType(template);
      }
    }

    this.logger.warn('Template not found', { type, channel, locale, tenantId });
    return null;
  }

  async renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): Promise<RenderedTemplate> {
    try {
      // Merge default variables with provided variables
      const allVariables = {
        ...(template as any).defaultVariables,
        ...variables,
      };

      // Render content using simple template engine
      const renderedContent = this.renderTemplateString(
        template.content,
        allVariables,
      );
      const renderedSubject = template.subject
        ? this.renderTemplateString(template.subject, allVariables)
        : undefined;
      const renderedTitle = template.title
        ? this.renderTemplateString(template.title, allVariables)
        : undefined;
      const renderedHtmlContent = template.htmlContent
        ? this.renderTemplateString(template.htmlContent, allVariables)
        : undefined;

      return {
        subject: renderedSubject,
        title: renderedTitle,
        content: renderedContent,
        htmlContent: renderedHtmlContent,
      };
    } catch (error) {
      this.logger.error('Template rendering failed', error.stack, {
        templateId: template.id,
        variables,
      });
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<CreateTemplateDto>,
    updatedBy: string,
  ): Promise<NotificationTemplate> {
    const updateData: any = { ...updates };
    if (updatedBy) {
      updateData.updatedBy = updatedBy;
    }

    const template = await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return this.mapToTemplateType(template);
  }

  async activateTemplate(templateId: string): Promise<void> {
    await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: { status: TemplateStatus.ACTIVE as PrismaTemplateStatus },
    });
  }

  async deactivateTemplate(templateId: string): Promise<void> {
    await this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: { status: TemplateStatus.ARCHIVED as PrismaTemplateStatus },
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.prisma.notificationTemplate.delete({
      where: { id: templateId },
    });
  }

  // ============================================================================
  // TEMPLATE QUERIES
  // ============================================================================

  async getTemplates(
    filters: {
      type?: NotificationType;
      channel?: NotificationChannel;
      status?: TemplateStatus;
      tenantId?: string;
      isGlobal?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;
    if (filters.tenantId !== undefined) where.tenantId = filters.tenantId;
    if (filters.isGlobal !== undefined) where.isGlobal = filters.isGlobal;

    const [templates, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      templates: templates.map((t) => this.mapToTemplateType(t)),
      total,
    };
  }

  async getTemplateById(
    templateId: string,
  ): Promise<NotificationTemplate | null> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    return template ? this.mapToTemplateType(template) : null;
  }

  // ============================================================================
  // TEMPLATE LOCALIZATION
  // ============================================================================

  async createLocalization(
    templateId: string,
    locale: string,
    content: {
      subject?: string;
      title?: string;
      content: string;
      htmlContent?: string;
    },
  ): Promise<void> {
    await (this.prisma as any).notificationTemplateLocalization.create({
      data: {
        templateId,
        locale,
        ...content,
      },
    });
  }

  async getLocalization(
    templateId: string,
    locale: string,
  ): Promise<any | null> {
    return (this.prisma as any).notificationTemplateLocalization.findUnique({
      where: {
        templateId_locale: {
          templateId,
          locale,
        },
      },
    });
  }

  async updateLocalization(
    templateId: string,
    locale: string,
    content: {
      subject?: string;
      title?: string;
      content?: string;
      htmlContent?: string;
    },
  ): Promise<void> {
    await (this.prisma as any).notificationTemplateLocalization.update({
      where: {
        templateId_locale: {
          templateId,
          locale,
        },
      },
      data: content,
    });
  }

  // ============================================================================
  // TEMPLATE VALIDATION
  // ============================================================================

  async validateTemplate(template: NotificationTemplate): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check required fields
    if (!template.content) {
      errors.push('Content is required');
    }

    // Validate template variables
    const requiredVariables = template.variables || [];
    const contentVariables = this.extractVariables(template.content);

    for (const variable of requiredVariables) {
      if (!contentVariables.includes(variable)) {
        errors.push(`Required variable '${variable}' not found in content`);
      }
    }

    // Validate HTML content if present
    if (template.htmlContent) {
      const htmlVariables = this.extractVariables(template.htmlContent);
      for (const variable of requiredVariables) {
        if (!htmlVariables.includes(variable)) {
          errors.push(
            `Required variable '${variable}' not found in HTML content`,
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async testTemplate(
    templateId: string,
    testVariables: Record<string, any>,
  ): Promise<RenderedTemplate> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return this.renderTemplate(template, testVariables);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private renderTemplateString(
    template: string,
    variables: Record<string, any>,
  ): string {
    let rendered = template;

    // Simple template engine - replace {{variable}} with values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    // Handle conditional blocks {{#if variable}}...{{/if}}
    rendered = rendered.replace(
      /{{#if\s+(\w+)}}(.*?){{\/if}}/gs,
      (_, variable, content) => {
        return variables[variable] ? content : '';
      },
    );

    // Handle loops {{#each items}}...{{/each}}
    rendered = rendered.replace(
      /{{#each\s+(\w+)}}(.*?){{\/each}}/gs,
      (_, variable, content) => {
        const items = variables[variable];
        if (!Array.isArray(items)) return '';

        return items
          .map((item, index) => {
            let itemContent = content;
            // Replace {{this}} with current item
            itemContent = itemContent.replace(/{{this}}/g, String(item));
            // Replace {{@index}} with current index
            itemContent = itemContent.replace(/{{@index}}/g, String(index));
            // Replace {{item.property}} with item properties
            if (typeof item === 'object') {
              for (const [prop, val] of Object.entries(item)) {
                itemContent = itemContent.replace(
                  new RegExp(`{{${variable}\\.${prop}}}`, 'g'),
                  String(val),
                );
              }
            }
            return itemContent;
          })
          .join('');
      },
    );

    return rendered;
  }

  private extractVariables(template: string): string[] {
    const variableRegex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  private mapToTemplateType(template: any): NotificationTemplate {
    return {
      id: template.id,
      type: template.type,
      channel: template.channel,
      category: template.category,
      locale: template.locale,
      subject: template.subject,
      title: template.title,
      content: template.content,
      htmlContent: template.htmlContent,
      variables: template.variables,
      isActive: template.status === TemplateStatus.ACTIVE,
      version: template.version,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
