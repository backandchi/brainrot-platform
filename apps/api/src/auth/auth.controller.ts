import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  async telegramAuth(
    @Body('initData') initData: string,
    @Body('referrerCode') referrerCode?: string,
  ) {
    return this.authService.validateTelegramInitData(initData, referrerCode);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('roblox-nick')
  async updateRobloxNick(@Req() req: any, @Body('username') username: string) {
    return this.authService.updateRobloxUsername(req.user.id, username);
  }
}
