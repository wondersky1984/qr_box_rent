import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class ExtendRentalDto {
  @IsOptional()
  @IsString()
  tariffId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
