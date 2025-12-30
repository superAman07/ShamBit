import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerAccountStatus, KycStatus } from '../enums/settlement-status.enum';

export class CreateSellerAccountDto {
  @ApiProperty({ description: 'Seller unique identifier', example: 'seller_123' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ description: 'Bank account holder name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @ApiProperty({ description: 'Bank account number', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ description: 'Bank IFSC code', example: 'HDFC0001234' })
  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @ApiProperty({ description: 'Bank name', example: 'HDFC Bank' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiPropertyOptional({ description: 'Bank branch name', example: 'Mumbai Main Branch' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ 
    description: 'Bank account type', 
    enum: ['SAVINGS', 'CURRENT'], 
    example: 'SAVINGS',
    default: 'SAVINGS'
  })
  @IsEnum(['SAVINGS', 'CURRENT'])
  @IsOptional()
  accountType?: string = 'SAVINGS';

  @ApiPropertyOptional({ description: 'UPI ID for payments', example: 'john@paytm' })
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiPropertyOptional({ description: 'Business name (for business accounts)', example: 'ABC Private Limited' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ 
    description: 'Business type', 
    example: 'INDIVIDUAL',
    enum: ['INDIVIDUAL', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP']
  })
  @IsString()
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: 'GST number (for business accounts)', example: '29ABCDE1234F1Z5' })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'PAN number', example: 'ABCDE1234F' })
  @IsString()
  @IsOptional()
  panNumber?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { source: 'onboarding' } })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateSellerAccountDto {
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsString()
  @IsOptional()
  upiId?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsObject()
  @IsNotEmpty()
  documents: {
    panCard?: {
      number: string;
      imageUrl: string;
    };
    aadharCard?: {
      number: string;
      imageUrl: string;
    };
    bankStatement?: {
      imageUrl: string;
    };
    gstCertificate?: {
      number: string;
      imageUrl: string;
    };
    incorporationCertificate?: {
      imageUrl: string;
    };
  };

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class VerifyKycDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  verifiedBy: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class RejectKycDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  rejectedBy: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateAccountStatusDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(SellerAccountStatus)
  status: SellerAccountStatus;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class SetupRazorpayAccountDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  razorpayAccountId: string;

  @IsString()
  @IsNotEmpty()
  razorpayContactId: string;

  @IsString()
  @IsNotEmpty()
  razorpayFundAccountId: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}