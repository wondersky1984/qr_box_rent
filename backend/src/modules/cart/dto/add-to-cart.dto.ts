import { IsOptional, IsString } from 'class-validator';

export class AddToCartDto {
  @IsString()
  lockerId!: string;

  @IsOptional()
  @IsString()
  tariffId?: string;
}
