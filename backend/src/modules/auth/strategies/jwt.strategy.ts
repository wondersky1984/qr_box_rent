import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  console.log('[JWT-EXTRACTOR] Called! Has cookies:', !!req?.cookies);
  if (req && req.cookies) {
    const token = req.cookies['lockbox_access'];
    console.log('[JWT-EXTRACTOR] Token:', token ? `${token.substring(0, 30)}...` : 'null');
    return token;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    console.log('[JWT-STRATEGY] Constructor called, secret:', configService.get<string>('app.jwt.accessSecret') ? 'EXISTS' : 'MISSING');
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
    console.log('[JWT-STRATEGY] Validate called! Payload:', payload);
    return { userId: payload.sub, role: payload.role, phone: payload.phone };
  }
}
