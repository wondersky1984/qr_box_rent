import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    console.log('[JwtAuthGuard] ================ START canActivate ================');
    const request = context.switchToHttp().getRequest();
    console.log(`[JwtAuthGuard] 🔐 Activated for ${request.method} ${request.url}`);
    console.log(`[JwtAuthGuard] 🍪 Cookies:`, request.cookies);
    console.log(`[JwtAuthGuard] 🍪 lockbox_access:`, request.cookies?.lockbox_access ? 'EXISTS' : 'NOT FOUND');
    this.logger.log(`🔐 JwtAuthGuard activated for ${request.method} ${request.url}`);
    this.logger.log(`🍪 Cookies present: ${Object.keys(request.cookies || {}).join(', ')}`);
    this.logger.log(`🍪 lockbox_access cookie: ${request.cookies?.lockbox_access ? 'EXISTS' : 'NOT FOUND'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log(`[JwtAuthGuard] 📥 handleRequest called`);
    console.log(`[JwtAuthGuard]   err:`, err);
    console.log(`[JwtAuthGuard]   user:`, user);
    console.log(`[JwtAuthGuard]   info:`, info);
    this.logger.log(`📥 JwtAuthGuard.handleRequest called`);
    this.logger.log(`   err: ${err}`);
    this.logger.log(`   user: ${JSON.stringify(user)}`);
    this.logger.log(`   info: ${JSON.stringify(info)}`);
    
    if (err || !user) {
      this.logger.error(`❌ JWT authentication failed: ${err?.message || info?.message || 'Unknown error'}`);
    } else {
      this.logger.log(`✅ JWT authentication successful for user ${user.userId}`);
    }
    
    return super.handleRequest(err, user, info, context);
  }
}
