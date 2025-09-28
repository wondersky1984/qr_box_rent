import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateTariffDto {
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
