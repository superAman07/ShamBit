import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { CartModule } from './cart.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('Cart Integration Test', () => {
  let cartService: CartService;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CartModule],
    }).compile();

    cartService = module.get<CartService>(CartService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(cartService).toBeDefined();
  });

  it('should create a cart service instance', () => {
    expect(cartService).toBeInstanceOf(CartService);
  });
});
