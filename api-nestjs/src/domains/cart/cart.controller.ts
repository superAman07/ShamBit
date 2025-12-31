import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CartPricingService } from './cart-pricing.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import {
  AddItemToCartDto,
  UpdateCartItemDto,
  ApplyPromotionDto,
  ApplyMultiplePromotionsDto,
  CartFiltersDto,
  PaginationDto,
  CartIncludeOptionsDto,
  MergeCartDto,
  BulkUpdateCartItemsDto,
  CartPricingOptionsDto,
  CartResponseDto,
  CartSummaryResponseDto,
  CartItemResponseDto,
  PriceChangeResponseDto,
  CartPricingResponseDto,
  ApiResponseDto,
  PaginatedResponseDto,
} from './dto/cart.dto';

@ApiTags('Cart Management')
@Controller('cart')
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(
    private readonly cartService: CartService,
    private readonly cartPricingService: CartPricingService,
    private readonly inventoryReservationService: InventoryReservationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get or create cart',
    description: 'Get existing cart or create new one for user/session',
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiQuery({ name: 'include', type: CartIncludeOptionsDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved or created successfully',
    type: ApiResponseDto<CartResponseDto>,
  })
  async getOrCreateCart(
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
    @Query() includeOptions?: CartIncludeOptionsDto,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    try {
      const userId = req.user?.id;

      if (!userId && !sessionId) {
        throw new BadRequestException(
          'Either authentication or session ID is required',
        );
      }

      const cart = await this.cartService.getOrCreateCart(userId, sessionId);

      return {
        success: true,
        data: this.transformCartResponse(cart),
        message: 'Cart retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get/create cart: ${error.message}`);
      throw error;
    }
  }

  @Get(':cartId')
  @ApiOperation({
    summary: 'Get cart by ID',
    description: 'Retrieve specific cart with all details',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiQuery({ name: 'include', type: CartIncludeOptionsDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: ApiResponseDto<CartResponseDto>,
  })
  async getCart(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
    @Query() includeOptions?: CartIncludeOptionsDto,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    try {
      const userId = req.user?.id;
      const cart = await this.cartService.getCart(cartId, userId, sessionId);

      return {
        success: true,
        data: this.transformCartResponse(cart),
        message: 'Cart retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get cart ${cartId}: ${error.message}`);
      throw error;
    }
  }

  @Get(':cartId/summary')
  @ApiOperation({
    summary: 'Get cart summary',
    description: 'Get cart with additional summary information',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart summary retrieved successfully',
    type: ApiResponseDto<CartSummaryResponseDto>,
  })
  async getCartSummary(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<CartSummaryResponseDto>> {
    try {
      const userId = req.user?.id;
      const summary = await this.cartService.getCartSummary(
        cartId,
        userId,
        sessionId,
      );

      return {
        success: true,
        data: this.transformCartSummaryResponse(summary),
        message: 'Cart summary retrieved successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cart summary ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Post(':cartId/items')
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Add a product variant to the cart with specified quantity',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiBody({ type: AddItemToCartDto })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: ApiResponseDto<CartItemResponseDto>,
  })
  @HttpCode(HttpStatus.CREATED)
  async addItemToCart(
    @Param('cartId') cartId: string,
    @Body() addItemDto: AddItemToCartDto,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<CartItemResponseDto>> {
    try {
      const userId = req.user?.id;
      const cartItem = await this.cartService.addItem(
        cartId,
        addItemDto,
        userId,
        sessionId,
      );

      return {
        success: true,
        data: this.transformCartItemResponse(cartItem),
        message: 'Item added to cart successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to add item to cart ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Put(':cartId/items/:itemId')
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Update the quantity of a specific item in the cart',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiParam({ name: 'itemId', description: 'Cart Item ID' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    type: ApiResponseDto<CartItemResponseDto>,
  })
  async updateCartItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateCartItemDto,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<CartItemResponseDto | null>> {
    try {
      const userId = req.user?.id;
      const cartItem = await this.cartService.updateItemQuantity(
        itemId,
        updateItemDto.quantity,
        userId,
        sessionId,
      );

      return {
        success: true,
        data: cartItem ? this.transformCartItemResponse(cartItem) : null,
        message: cartItem
          ? 'Cart item updated successfully'
          : 'Cart item removed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to update cart item ${itemId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Remove a specific item from the cart',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiParam({ name: 'itemId', description: 'Cart Item ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
    type: ApiResponseDto<null>,
  })
  async removeItemFromCart(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<null>> {
    try {
      const userId = req.user?.id;
      await this.cartService.removeItem(itemId, userId, sessionId);

      return {
        success: true,
        data: null,
        message: 'Item removed from cart successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove item ${itemId} from cart: ${error.message}`,
      );
      throw error;
    }
  }

  @Delete(':cartId/items')
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Remove all items from the cart',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: ApiResponseDto<null>,
  })
  async clearCart(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<null>> {
    try {
      const userId = req.user?.id;
      await this.cartService.clearCart(cartId, userId, sessionId);

      return {
        success: true,
        data: null,
        message: 'Cart cleared successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to clear cart ${cartId}: ${error.message}`);
      throw error;
    }
  }

  @Put(':cartId/items/bulk')
  @ApiOperation({
    summary: 'Bulk update cart items',
    description: 'Update multiple cart items in a single request',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiBody({ type: BulkUpdateCartItemsDto })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart items updated successfully',
    type: ApiResponseDto<CartItemResponseDto[]>,
  })
  async bulkUpdateCartItems(
    @Param('cartId') cartId: string,
    @Body() bulkUpdateDto: BulkUpdateCartItemsDto,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<CartItemResponseDto[]>> {
    try {
      const userId = req.user?.id;
      const updatedItems: CartItemResponseDto[] = [];

      for (const itemUpdate of bulkUpdateDto.items) {
        const cartItem = await this.cartService.updateItemQuantity(
          itemUpdate.itemId,
          itemUpdate.quantity,
          userId,
          sessionId,
        );

        if (cartItem) {
          updatedItems.push(this.transformCartItemResponse(cartItem));
        }
      }

      return {
        success: true,
        data: updatedItems,
        message: 'Cart items updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to bulk update cart items: ${error.message}`);
      throw error;
    }
  }

  @Post('merge')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Merge guest cart with user cart',
    description: 'Merge guest cart into authenticated user cart',
  })
  @ApiBody({ type: MergeCartDto })
  @ApiResponse({
    status: 200,
    description: 'Carts merged successfully',
    type: ApiResponseDto<CartResponseDto>,
  })
  async mergeGuestCart(
    @Body() mergeCartDto: MergeCartDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestException(
          'User authentication required for cart merge',
        );
      }

      const mergedCart = await this.cartService.mergeGuestCart(
        mergeCartDto.guestSessionId,
        userId,
      );

      return {
        success: true,
        data: this.transformCartResponse(mergedCart),
        message: 'Carts merged successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to merge guest cart: ${error.message}`);
      throw error;
    }
  }

  @Post(':cartId/refresh')
  @ApiOperation({
    summary: 'Refresh cart data',
    description: 'Refresh cart prices, availability, and promotions',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart refreshed successfully',
    type: ApiResponseDto<CartResponseDto>,
  })
  async refreshCart(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    try {
      const refreshedCart = await this.cartService.refreshCart(cartId);

      return {
        success: true,
        data: this.transformCartResponse(refreshedCart),
        message: 'Cart refreshed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to refresh cart ${cartId}: ${error.message}`);
      throw error;
    }
  }

  @Get(':cartId/pricing')
  @ApiOperation({
    summary: 'Get cart pricing details',
    description: 'Get detailed pricing breakdown for the cart',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiQuery({ name: 'options', type: CartPricingOptionsDto, required: false })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart pricing retrieved successfully',
    type: ApiResponseDto<CartPricingResponseDto>,
  })
  async getCartPricing(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
    @Query() options?: CartPricingOptionsDto,
  ): Promise<ApiResponseDto<CartPricingResponseDto>> {
    try {
      const userId = req.user?.id;
      const cart = await this.cartService.getCart(cartId, userId, sessionId);
      const pricing = await this.cartPricingService.calculateCartPricing(
        cart,
        options,
      );

      return {
        success: true,
        data: this.transformCartPricingResponse(pricing),
        message: 'Cart pricing retrieved successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get cart pricing ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Get(':cartId/price-changes')
  @ApiOperation({
    summary: 'Check for price changes',
    description: 'Check if any items in the cart have price changes',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Price changes checked successfully',
    type: ApiResponseDto<PriceChangeResponseDto>,
  })
  async checkPriceChanges(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ApiResponseDto<PriceChangeResponseDto>> {
    try {
      const userId = req.user?.id;
      const cart = await this.cartService.getCart(cartId, userId, sessionId);
      const priceChanges =
        await this.cartPricingService.handlePriceChanges(cart);

      return {
        success: true,
        data: this.transformPriceChangeResponse(priceChanges),
        message: 'Price changes checked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to check price changes for cart ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Get(':cartId/availability')
  @ApiOperation({
    summary: 'Check cart availability',
    description: 'Check availability of all items in the cart',
  })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session ID for guest users',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cart availability checked successfully',
  })
  async checkCartAvailability(
    @Param('cartId') cartId: string,
    @Request() req: any,
    @Headers('x-session-id') sessionId?: string,
  ) {
    try {
      const userId = req.user?.id;
      const cart = await this.cartService.getCart(cartId, userId, sessionId);
      const availability =
        await this.inventoryReservationService.checkCartAvailability(
          cart.items,
        );

      return {
        success: true,
        data: availability,
        message: 'Cart availability checked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to check cart availability ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Private helper methods for response transformation
  private transformCartResponse(cart: any): CartResponseDto {
    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      status: cart.status,
      subtotal: cart.subtotal?.toNumber() || 0,
      discountAmount: cart.discountAmount?.toNumber() || 0,
      taxAmount: cart.taxAmount?.toNumber() || 0,
      shippingAmount: cart.shippingAmount?.toNumber() || 0,
      totalAmount: cart.totalAmount?.toNumber() || 0,
      appliedPromotions: cart.appliedPromotions || [],
      availablePromotions: cart.availablePromotions || [],
      currency: cart.currency,
      locale: cart.locale,
      timezone: cart.timezone,
      expiresAt: cart.expiresAt?.toISOString(),
      lastActivityAt: cart.lastActivityAt?.toISOString(),
      convertedToOrderId: cart.convertedToOrderId,
      version: cart.version,
      createdAt: cart.createdAt?.toISOString(),
      updatedAt: cart.updatedAt?.toISOString(),
      items:
        cart.items?.map((item) => this.transformCartItemResponse(item)) || [],
    };
  }

  private transformCartItemResponse(item: any): CartItemResponseDto {
    return {
      id: item.id,
      variantId: item.variantId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toNumber() || 0,
      currentUnitPrice: item.currentUnitPrice?.toNumber() || 0,
      totalPrice: item.totalPrice?.toNumber() || 0,
      discountAmount: item.discountAmount?.toNumber() || 0,
      isAvailable: item.isAvailable,
      availabilityReason: item.availabilityReason,
      reservationId: item.reservationId,
      reservationExpiresAt: item.reservationExpiresAt?.toISOString(),
      addedAt: item.addedAt?.toISOString(),
      lastCheckedAt: item.lastCheckedAt?.toISOString(),
      variantSnapshot: item.variantSnapshot,
      pricingSnapshot: item.pricingSnapshot,
    };
  }

  private transformCartSummaryResponse(summary: any): CartSummaryResponseDto {
    return {
      ...this.transformCartResponse(summary.cart),
      itemCount: summary.itemCount,
      sellerCount: summary.sellerCount,
      hasUnavailableItems: summary.hasUnavailableItems,
      hasPriceChanges: summary.hasPriceChanges,
      estimatedTotal: summary.estimatedTotal?.toNumber() || 0,
    };
  }

  private transformPriceChangeResponse(
    priceChanges: any,
  ): PriceChangeResponseDto {
    return {
      hasChanges: priceChanges.hasChanges,
      changes:
        priceChanges.changes?.map((change) => ({
          itemId: change.itemId,
          variantId: change.variantId,
          oldPrice: change.oldPrice?.toNumber() || 0,
          newPrice: change.newPrice?.toNumber() || 0,
          priceIncrease: change.priceIncrease,
          percentageChange: change.percentageChange,
          impact: change.impact?.toNumber() || 0,
        })) || [],
      totalImpact: priceChanges.totalImpact?.toNumber() || 0,
      affectedItemsCount: priceChanges.affectedItemsCount,
    };
  }

  private transformCartPricingResponse(pricing: any): CartPricingResponseDto {
    return {
      subtotal: pricing.subtotal?.toNumber() || 0,
      discountAmount: pricing.discountAmount?.toNumber() || 0,
      taxAmount: pricing.taxAmount?.toNumber() || 0,
      shippingAmount: pricing.shippingAmount?.toNumber() || 0,
      totalAmount: pricing.totalAmount?.toNumber() || 0,
      currency: pricing.currency,
      breakdown: pricing.breakdown,
    };
  }
}
