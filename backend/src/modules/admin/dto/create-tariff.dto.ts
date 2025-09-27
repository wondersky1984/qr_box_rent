import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TariffCode } from '@prisma/client';

export class CreateTariffDto {
  @IsEnum(TariffCode)
  code!: TariffCode;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @IsPositive()
  priceRub!: number;

  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
