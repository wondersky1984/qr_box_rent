import { IsOptional, IsUUID } from 'class-validator';

export class ExtendRentalDto {
  @IsOptional()
  @IsUUID()
  tariffId?: string;
}
