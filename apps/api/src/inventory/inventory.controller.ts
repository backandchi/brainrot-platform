import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  async getInventory(@Req() req: any) {
    return this.inventoryService.getUserInventory(req.user.id);
  }

  @Post(':id/sell')
  async sellItem(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.sellItem(req.user.id, id);
  }

  @Post('sell-all')
  async sellAll(@Req() req: any) {
    return this.inventoryService.sellAllItems(req.user.id);
  }

  @Post('farm/stake')
  async stakeToFarm(
    @Req() req: any,
    @Body('inventoryItemId') inventoryItemId: string,
    @Body('plotIndex') plotIndex: number,
  ) {
    return this.inventoryService.stakeToFarm(req.user.id, inventoryItemId, plotIndex);
  }

  @Post('farm/unstake')
  async unstakeFromFarm(@Req() req: any, @Body('plotIndex') plotIndex: number) {
    return this.inventoryService.unstakeFromFarm(req.user.id, plotIndex);
  }

  @Post('farm/harvest')
  async harvestFarm(@Req() req: any) {
    return this.inventoryService.harvestFarm(req.user.id);
  }
}
