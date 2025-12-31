import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { BrandService } from '../brand.service';
import { BrandPolicies } from '../brand.policies';
import { BrandPermission } from '../enums/brand-scope.enum';
import {
  BrandAccessGrantedEvent,
  BrandAccessRevokedEvent,
} from '../events/brand.events';
import { UserRole } from '../../../common/types';

export interface BrandAccessEntry {
  id: string;
  brandId: string;
  sellerId: string;
  permission: BrandPermission;
  grantedBy: string;
  grantedAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface GrantBrandAccessDto {
  sellerId: string;
  permission: BrandPermission;
  reason?: string;
}

@Injectable()
export class BrandAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandService: BrandService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async grantAccess(
    brandId: string,
    grantDto: GrantBrandAccessDto,
    grantedBy: string,
    granterRole: UserRole,
  ): Promise<BrandAccessEntry> {
    this.logger.log('BrandAccessService.grantAccess', {
      brandId,
      grantDto,
      grantedBy,
    });

    const brand = await this.brandService.findById(brandId);

    // Check if granter has permission to grant access
    if (
      !BrandPolicies.canGrantBrandAccess(
        brand,
        grantedBy,
        granterRole,
        grantDto.sellerId,
        grantDto.permission,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to grant brand access',
      );
    }

    // Check if access already exists
    const existingAccess = await this.prisma.brandAccess.findUnique({
      where: {
        brandId_sellerId: {
          brandId,
          sellerId: grantDto.sellerId,
        },
      },
    });

    if (existingAccess && !existingAccess.revokedAt) {
      throw new ConflictException(
        'Brand access already granted to this seller',
      );
    }

    // Create or restore access
    const access = await this.prisma.brandAccess.upsert({
      where: {
        brandId_sellerId: {
          brandId,
          sellerId: grantDto.sellerId,
        },
      },
      update: {
        permission: grantDto.permission,
        grantedBy,
        grantedAt: new Date(),
        revokedAt: null,
        revokedBy: null,
      },
      create: {
        brandId,
        sellerId: grantDto.sellerId,
        permission: grantDto.permission,
        grantedBy,
      },
    });

    // Emit event
    this.eventEmitter.emit(
      BrandAccessGrantedEvent.eventName,
      new BrandAccessGrantedEvent(
        brandId,
        brand.name,
        grantDto.sellerId,
        grantDto.permission,
        grantedBy,
      ),
    );

    this.logger.log('Brand access granted successfully', {
      brandId,
      sellerId: grantDto.sellerId,
      permission: grantDto.permission,
    });

    return this.mapToAccessEntry(access);
  }

  async revokeAccess(
    brandId: string,
    sellerId: string,
    revokedBy: string,
    revokerRole: UserRole,
    reason?: string,
  ): Promise<void> {
    this.logger.log('BrandAccessService.revokeAccess', {
      brandId,
      sellerId,
      revokedBy,
    });

    const brand = await this.brandService.findById(brandId);

    // Check if revoker has permission
    if (
      !BrandPolicies.canGrantBrandAccess(
        brand,
        revokedBy,
        revokerRole,
        sellerId,
        BrandPermission.USE,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to revoke brand access',
      );
    }

    const access = await this.prisma.brandAccess.findUnique({
      where: {
        brandId_sellerId: {
          brandId,
          sellerId,
        },
      },
    });

    if (!access || access.revokedAt) {
      throw new NotFoundException('Active brand access not found');
    }

    // Revoke access
    await this.prisma.brandAccess.update({
      where: {
        brandId_sellerId: {
          brandId,
          sellerId,
        },
      },
      data: {
        revokedAt: new Date(),
        revokedBy,
      },
    });

    // Emit event
    this.eventEmitter.emit(
      BrandAccessRevokedEvent.eventName,
      new BrandAccessRevokedEvent(
        brandId,
        brand.name,
        sellerId,
        revokedBy,
        reason,
      ),
    );

    this.logger.log('Brand access revoked successfully', { brandId, sellerId });
  }

  async getBrandAccess(brandId: string): Promise<BrandAccessEntry[]> {
    const accessEntries = await this.prisma.brandAccess.findMany({
      where: {
        brandId,
        revokedAt: null, // Only active access
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        grantedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });

    return accessEntries.map(this.mapToAccessEntry);
  }

  async getSellerBrandAccess(sellerId: string): Promise<BrandAccessEntry[]> {
    const accessEntries = await this.prisma.brandAccess.findMany({
      where: {
        sellerId,
        revokedAt: null, // Only active access
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        grantedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });

    return accessEntries.map(this.mapToAccessEntry);
  }

  async hasAccess(
    brandId: string,
    sellerId: string,
    permission: BrandPermission,
  ): Promise<boolean> {
    const access = await this.prisma.brandAccess.findUnique({
      where: {
        brandId_sellerId: {
          brandId,
          sellerId,
        },
      },
    });

    if (!access || access.revokedAt) {
      return false;
    }

    // VIEW permission includes USE permission
    if (permission === BrandPermission.VIEW) {
      return true;
    }

    // For USE permission, check exact match
    return access.permission === BrandPermission.USE;
  }

  async bulkGrantAccess(
    brandId: string,
    sellerIds: string[],
    permission: BrandPermission,
    grantedBy: string,
    granterRole: UserRole,
  ): Promise<BrandAccessEntry[]> {
    this.logger.log('BrandAccessService.bulkGrantAccess', {
      brandId,
      sellerCount: sellerIds.length,
      permission,
    });

    const brand = await this.brandService.findById(brandId);

    // Validate permissions for each seller
    for (const sellerId of sellerIds) {
      if (
        !BrandPolicies.canGrantBrandAccess(
          brand,
          grantedBy,
          granterRole,
          sellerId,
          permission,
        )
      ) {
        throw new ForbiddenException(
          `Insufficient permissions to grant access to seller ${sellerId}`,
        );
      }
    }

    const results: BrandAccessEntry[] = [];

    // Grant access to each seller
    for (const sellerId of sellerIds) {
      try {
        const access = await this.grantAccess(
          brandId,
          { sellerId, permission },
          grantedBy,
          granterRole,
        );
        results.push(access);
      } catch (error) {
        this.logger.warn('Failed to grant access to seller', {
          brandId,
          sellerId,
          error: error.message,
        });
        // Continue with other sellers
      }
    }

    return results;
  }

  async getAccessHistory(
    brandId: string,
    sellerId?: string,
  ): Promise<BrandAccessEntry[]> {
    const where: any = { brandId };
    if (sellerId) {
      where.sellerId = sellerId;
    }

    const accessEntries = await this.prisma.brandAccess.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        grantedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        revokedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });

    return accessEntries.map(this.mapToAccessEntry);
  }

  private mapToAccessEntry(prismaData: any): BrandAccessEntry {
    return {
      id: prismaData.id,
      brandId: prismaData.brandId,
      sellerId: prismaData.sellerId,
      permission: prismaData.permission,
      grantedBy: prismaData.grantedBy,
      grantedAt: prismaData.grantedAt,
      revokedAt: prismaData.revokedAt,
      revokedBy: prismaData.revokedBy,
    };
  }
}
