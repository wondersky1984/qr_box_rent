import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class GetLockersQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string' && value.length > 0) {
      return [value];
    }
    return undefined;
  })
  @IsEnum(LockerStatus, { each: true })
  status?: LockerStatus[];

  @IsOptional()
  @IsString()
  search?: string;
}
