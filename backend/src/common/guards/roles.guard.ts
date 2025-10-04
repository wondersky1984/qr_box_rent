import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.log(`🔐 Required roles: ${JSON.stringify(requiredRoles)}`);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role?: Role } }>();
    const role = request.user?.role as Role | undefined;
    
    this.logger.log(`👤 User role: ${role}, User: ${JSON.stringify(request.user)}`);
    
    if (!role) {
      this.logger.warn('❌ No role found in request.user');
      return false;
    }

    const hasAccess = requiredRoles.includes(role);
    this.logger.log(`🎯 Access: ${hasAccess}, comparing "${role}" in [${requiredRoles}]`);
    
    return hasAccess;
  }
}
