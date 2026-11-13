import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { TradesService } from './trades.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/trades')
export class TradesController {
  constructor(private tradesService: TradesService) {}

  @Get('roblox/verify/:username')
  async verifyRoblox(@Param('username') username: string) {
    return this.tradesService.verifyRobloxUser(username);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  async createDeposit(
    @Req() req: any,
    @Body('robloxUsername') robloxUsername: string,
    @Body('itemIds') itemIds: string[],
  ) {
    return this.tradesService.createDepositRequest(req.user.id, robloxUsername, itemIds);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('withdraw')
  async createWithdraw(
    @Req() req: any,
    @Body('robloxUsername') robloxUsername: string,
    @Body('inventoryItemId') inventoryItemId: string,
  ) {
    return this.tradesService.createWithdrawRequest(req.user.id, robloxUsername, inventoryItemId);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.tradesService.getTradeStatus(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/:id/approve')
  async approveTrade(
    @Req() req: any,
    @Param('id') id: string,
    @Body('serverLink') serverLink: string,
  ) {
    if (req.user.role !== 'ADMIN') throw new Error('Unauthorized admin action');
    return this.tradesService.adminApproveTrade(id, serverLink);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/:id/complete')
  async completeTrade(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new Error('Unauthorized admin action');
    return this.tradesService.adminCompleteTrade(id);
  }
}
