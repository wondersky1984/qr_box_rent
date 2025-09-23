import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AuditAction } from '@prisma/client';

export class AuditQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  lockerId?: string;

  @IsOptional()
  @IsString()
  userPhone?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  onlyPaidOpens?: string;

  @IsOptional()
  onlyAdminOpens?: string;
}
