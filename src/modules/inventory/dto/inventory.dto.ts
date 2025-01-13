import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf
} from "class-validator";
import { InventoryStatus } from "../../../database/models/inventory.model";
import { PaymentProcessor } from "../../../database/models/payment.model";
import { PaymentCurrency } from "../../../database/models/types";

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  category: string;

  @IsNumber()
  @Min(1_00)
  price: number;

  @IsEnum(PaymentCurrency)
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;
}

enum QueryInventoryStatus {
  Available = "available",
  OutOfStock = "out_of_stock",
}

export class UpdateInventoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  price?: number;

  @IsEnum(PaymentCurrency)
  @IsOptional()
  @ValidateIf((o) => typeof o.price !== "undefined")
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsEnum(QueryInventoryStatus)
  @IsOptional()
  status?: InventoryStatus;
}

export class QueryInventoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(QueryInventoryStatus)
  @IsOptional()
  status?: InventoryStatus;

  @IsNumber()
  @Min(1)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPrice?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class GetInventoryPayments {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;
}

export class InitiatePaymentDto {
  @IsEnum(PaymentProcessor)
  processor: PaymentProcessor

  inventory: string
}