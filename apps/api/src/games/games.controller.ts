import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GamesService } from './games.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/games')
@UseGuards(AuthGuard('jwt'))
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Post('crash/play')
  async playCrash(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('cashoutMultiplier') cashoutMultiplier: number,
    @Body('clientSeed') clientSeed?: string,
  ) {
    return this.gamesService.playCrash(req.user.id, betAmount, cashoutMultiplier, clientSeed);
  }

  @Post('mines/start')
  async startMines(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('mineCount') mineCount: number,
    @Body('clientSeed') clientSeed?: string,
  ) {
    return this.gamesService.startMines(req.user.id, betAmount, mineCount, clientSeed);
  }

  @Post('mines/reveal')
  async revealMine(
    @Req() req: any,
    @Body('sessionId') sessionId: string,
    @Body('cellIndex') cellIndex: number,
  ) {
    return this.gamesService.revealMineCell(req.user.id, sessionId, cellIndex);
  }

  @Post('mines/cashout')
  async cashoutMines(@Req() req: any, @Body('sessionId') sessionId: string) {
    return this.gamesService.cashoutMines(req.user.id, sessionId);
  }

  @Post('dice/play')
  async playDice(
    @Req() req: any,
    @Body('betAmount') betAmount: number,
    @Body('winChance') winChance: number,
    @Body('mode') mode: 'OVER' | 'UNDER',
    @Body('clientSeed') clientSeed?: string,
  ) {
    return this.gamesService.playDice(req.user.id, betAmount, winChance, mode, clientSeed);
  }

  @Post('upgrader/play')
  async playUpgrader(
    @Req() req: any,
    @Body('inputInventoryItemId') inputInventoryItemId: string,
    @Body('targetItemId') targetItemId: string,
    @Body('clientSeed') clientSeed?: string,
  ) {
    return this.gamesService.playUpgrader(req.user.id, inputInventoryItemId, targetItemId, clientSeed);
  }

  @Post('fuse/play')
  async playFuse(@Req() req: any, @Body('inputInventoryItemIds') inputInventoryItemIds: string[]) {
    return this.gamesService.playFuse(req.user.id, inputInventoryItemIds);
  }
}
