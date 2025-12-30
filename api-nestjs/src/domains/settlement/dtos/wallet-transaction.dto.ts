import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsObject, Min } from 'class-validator';
import { WalletTransactionType, WalletTransactionCategory } from '../enums/settlement-status.enum';

export class CreateWalletTransactionDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsOptional()
  sellerAccountId?: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsEnum(WalletTransactionType)
  type: WalletTransactionType;

  @IsEnum(WalletTransactionCategory)
  category: WalletTransactionCategory;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsOptional()
  settlementId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class CreditWalletDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(WalletTransactionCategory)
  category: WalletTransactionCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class DebitWalletDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(WalletTransactionCategory)
  category: WalletTransactionCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  settlementId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class ReserveWalletBalanceDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class ReleaseWalletReserveDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class MovePendingToAvailableDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}