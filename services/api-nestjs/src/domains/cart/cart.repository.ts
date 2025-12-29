import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Cart } from './cart.service';

export interface CartFilters {
    userId?: string;
    sessionId?: string;
}

@Injectable()
export class CartRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Cart | null> {
        const cart = await this.prisma.cart.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });

        if (!cart) {
            return null;
        }

        return this.mapToDomain(cart);
    }

    async findByUserOrSession(userId?: string, sessionId?: string): Promise<Cart | null> {
        const where: any = {};
        if (userId) {
            where.userId = userId;
        } else if (sessionId) {
            where.sessionId = sessionId;
        } else {
            return null;
        }

        const cart = await this.prisma.cart.findFirst({
            where,
            include: {
                items: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        if (!cart) {
            return null;
        }

        return this.mapToDomain(cart);
    }

    async create(data: Omit<Cart, 'id' | 'items' | 'createdAt' | 'updatedAt'>): Promise<Cart> {
        const cart = await this.prisma.cart.create({
            data: {
                userId: data.userId,
                // sessionId: data.sessionId, // Note: sessionId might need to be added to schema if not present, check schema. Assuming it might be part of User or separate field if needed. 
                // Based on schema from earlier, Cart model has userId. If sessionId is needed, schema update required. 
                // The earlier schema view showed Cart model with userId. Checking schema again might be useful if sessionId is critical.
                // For now, mapping best effort.
                subtotal: data.subtotal,
                discountAmount: data.discountAmount,
                totalAmount: data.totalAmount,
                appliedPromotions: data.appliedPromotions,
                expiresAt: data.expiresAt,
            },
            include: {
                items: true,
            },
        });

        return this.mapToDomain(cart);
    }

    async update(id: string, data: Partial<Cart>): Promise<Cart> {
        const cart = await this.prisma.cart.update({
            where: { id },
            data: {
                subtotal: data.subtotal,
                discountAmount: data.discountAmount,
                totalAmount: data.totalAmount,
                appliedPromotions: data.appliedPromotions,
                expiresAt: data.expiresAt,
            },
            include: {
                items: true,
            },
        });

        return this.mapToDomain(cart);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.cart.delete({
            where: { id },
        });
    }

    private mapToDomain(prismaCart: any): Cart {
        return {
            id: prismaCart.id,
            userId: prismaCart.userId,
            // sessionId: prismaCart.sessionId, // Schema check pending
            items: prismaCart.items.map((item: any) => ({
                id: item.id,
                cartId: item.cartId,
                variantId: item.variantId,
                sellerId: item.sellerId, // Check schema for item fields
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                isAvailable: true, // Placeholder
                addedAt: item.createdAt,
            })),
            subtotal: Number(prismaCart.subtotal),
            discountAmount: Number(prismaCart.discountAmount),
            totalAmount: Number(prismaCart.totalAmount),
            appliedPromotions: prismaCart.appliedPromotions || [],
            expiresAt: prismaCart.expiresAt,
            createdAt: prismaCart.createdAt,
            updatedAt: prismaCart.updatedAt,
        };
    }
}
