import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  console.log('[JWT] Extracting cookie, cookies:', req.cookies);
  console.log('[JWT] lockbox_access:', req.cookies?.['lockbox_access'] ? 'EXISTS' : 'NOT FOUND');
  if (req && req.cookies) {
    const token = req.cookies['lockbox_access'];
    console.log('[JWT] Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  }
  console.log('[JWT] No cookies found');
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.accessSecret'),
    });
  }

  async validate(payload: any) {
    const user = { userId: payload.sub, role: payload.role, phone: payload.phone };
    this.logger.log(`🔑 JWT validated! Payload: ${JSON.stringify(payload)}, Returning user: ${JSON.stringify(user)}`);
    return user;
  }
}
