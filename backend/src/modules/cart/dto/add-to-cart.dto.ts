import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  lockerId!: string;

  @IsOptional()
  @IsUUID()
  tariffId?: string;
}
