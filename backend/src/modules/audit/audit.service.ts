import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActorType, AuditAction, Prisma } from '@prisma/client';
import { Parser } from 'json2csv';

interface CreateAuditLogInput {
  actorType: ActorType;
  actorId?: string;
  action: AuditAction;
  lockerId?: string;
  orderId?: string;
  orderItemId?: string;
  paymentId?: string;
  userId?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface AuditFilters {
  from?: Date;
  to?: Date;
  lockerId?: string;
  userPhone?: string;
  managerId?: string;
  action?: AuditAction;
  onlyPaidOpens?: boolean;
  onlyAdminOpens?: boolean;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(input: CreateAuditLogInput) {
    const metadata =
      input.metadata !== undefined
        ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
        : undefined;
    return this.prisma.auditLog.create({
      data: {
        ...input,
        metadata,
      },
    });
  }

  async query(filters: AuditFilters) {
    const where = {
      timestamp: {
        gte: filters.from,
        lte: filters.to,
      },
      lockerId: filters.lockerId,
      phone: filters.userPhone,
      action: filters.action,
      actorId: filters.managerId,
    } as any;

    if (filters.onlyPaidOpens) {
      where.action = 'LOCKER_OPEN';
      where.metadata = { path: ['source'], equals: 'PAID' };
    }
    if (filters.onlyAdminOpens) {
      where.action = 'LOCKER_OPEN';
      where.actorType = { in: ['ADMIN', 'MANAGER'] };
      where.metadata = { path: ['source'], equals: 'ADMIN' };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
    return logs;
  }

  async exportCsv(filters: AuditFilters) {
    const logs = await this.query(filters);
    const parser = new Parser<Record<string, unknown>>({
      fields: [
        'id',
        'timestamp',
        'actorType',
        'actorId',
        'action',
        'lockerId',
        'orderId',
        'orderItemId',
        'paymentId',
        'userId',
        'phone',
        'ip',
        'userAgent',
        'metadata',
      ],
      transforms: [
        (item: Record<string, unknown>) => ({
          ...item,
          metadata: JSON.stringify(item.metadata ?? {}),
        }),
      ],
    });

    return parser.parse(logs);
  }
}
