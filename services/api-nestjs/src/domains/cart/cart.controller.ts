import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CartService, AddToCartDto } from './cart.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, Public } from '../../common/decorators';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    return this.cartService.getOrCreateCart(userId, sessionId);
  }

  @Post('items')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Body() addToCartDto: AddToCartDto,
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.addToCart(cart.id, addToCartDto, userId);
  }

  @Put('items/:itemId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.updateQuantity(cart.id, itemId, body.quantity, userId);
  }

  @Delete('items/:itemId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    await this.cartService.removeFromCart(cart.id, itemId, userId);
  }

  @Post('promotions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply promotion to cart' })
  async applyPromotion(
    @Body() body: { promotionCode: string },
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.applyPromotion(cart.id, body.promotionCode, userId);
  }

  @Delete()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(
    @CurrentUser('id') userId?: string,
    @CurrentUser('sessionId') sessionId?: string,
  ) {
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    await this.cartService.clearCart(cart.id, userId);
  }
}