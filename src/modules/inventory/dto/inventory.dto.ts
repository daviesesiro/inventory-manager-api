import {
  IsEnum,
  IsMongoId,
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
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;
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
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ValidateIf((o) => typeof o.price !== "undefined")
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sku?: string;

  @IsEnum(InventoryStatus)
  @IsOptional()
  status?: InventoryStatus;
}

enum QueryInventoryStatus {
  Available = "available",
  OutOfStock = "out_of_stock",
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
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class InitiatePaymentDto {
  @IsEnum(PaymentProcessor)
  processor: PaymentProcessor

  @IsMongoId()
  @IsNotEmpty()
  inventory: string
}