import { IsString, IsNumber, IsOptional } from 'class-validator';
import {
  RefundLedgerEntryType,
  RefundAccountType,
} from '../enums/refund-status.enum';

export class CreateRefundLedgerEntryDto {
  @IsString()
  refundId: string;

  @IsString()
  entryType: RefundLedgerEntryType;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  accountType: RefundAccountType;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsNumber()
  runningBalance?: number;

  @IsOptional()
  metadata?: any;

  @IsString()
  createdBy: string;
}
