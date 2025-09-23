import { Body, Controller, Post, Res, Req, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { StartOtpDto } from './dto/start-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/start')
  async startOtp(@Body() dto: StartOtpDto) {
    await this.authService.startOtp(dto.phone);
    return { success: true };
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.verifyOtp(dto.phone, dto.code);
    this.authService.attachAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['lockbox_refresh'];
    const { accessToken, refreshToken: newRefreshToken, user } = await this.authService.refreshTokens(refreshToken);
    this.authService.attachAuthCookies(res, accessToken, newRefreshToken);
    return { user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user?.userId, req.cookies?.['lockbox_refresh']);
    res.clearCookie('lockbox_access', { httpOnly: true, sameSite: 'lax' });
    res.clearCookie('lockbox_refresh', { httpOnly: true, sameSite: 'lax' });
    return { success: true };
  }
}
