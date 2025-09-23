import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    const filters = this.mapFilters(query);
    return this.auditService.query(filters);
  }

  @Get('export')
  async export(@Query() query: AuditQueryDto, @Res() res: Response) {
    const filters = this.mapFilters(query);
    const csv = await this.auditService.exportCsv(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
    res.send(csv);
  }

  private mapFilters(query: AuditQueryDto) {
    return {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      lockerId: query.lockerId,
      userPhone: query.userPhone,
      managerId: query.managerId,
      action: query.action,
      onlyPaidOpens: query.onlyPaidOpens === 'true',
      onlyAdminOpens: query.onlyAdminOpens === 'true',
    };
  }
}
