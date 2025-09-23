import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LockerStatus } from '@prisma/client';

export class CreateLockerDto {
  @IsInt()
  @Min(1)
  number!: number;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsEnum(LockerStatus)
  status?: LockerStatus = LockerStatus.FREE;
}
