import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FreezeLockerDto {
  @IsOptional()
  @IsDateString()
  until?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
