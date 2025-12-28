import { IsString, IsOptional } from 'class-validator';

export class CreateSellerAccountDto {
  @IsString()
  sellerId: string;

  @IsString()
  accountNumber: string;

  @IsString()
  bankName: string;

  @IsString()
  accountHolderName: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  businessDetails?: any;

  @IsOptional()
  bankAccounts?: any[];

  @IsOptional()
  @IsString()
  primaryBankId?: string;

  @IsOptional()
  kycDocuments?: any[];

  @IsOptional()
  settlementSchedule?: any;
}