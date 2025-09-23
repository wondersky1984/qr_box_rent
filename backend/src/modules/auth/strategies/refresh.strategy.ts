import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const refreshToken = req.cookies?.['lockbox_refresh'];
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const { user } = await this.authService.refreshTokens(refreshToken);
    return user;
  }
}
