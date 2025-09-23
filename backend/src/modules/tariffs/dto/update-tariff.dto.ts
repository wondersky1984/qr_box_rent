import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TariffCode } from '@prisma/client';

export class UpdateTariffDto {
  @IsOptional()
  @IsEnum(TariffCode)
  code?: TariffCode;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  priceRub?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
