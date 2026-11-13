import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('items')
  async getAllItems(@Req() req: any) {
    return this.adminService.getAllItems();
  }

  @Post('items')
  async createItem(@Req() req: any, @Body() data: any) {
    return this.adminService.createBrainrotItem(data);
  }

  @Put('items/:id')
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.adminService.updateBrainrotItem(id, data);
  }

  @Delete('items/:id')
  async deleteItem(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteBrainrotItem(id);
  }

  @Post('cases')
  async createCase(@Req() req: any, @Body() data: any) {
    return this.adminService.createCase(data);
  }

  @Put('cases/:id/rtp')
  async updateRtp(@Req() req: any, @Param('id') id: string, @Body('rtp') rtp: number) {
    return this.adminService.updateCaseRtp(id, rtp);
  }

  @Get('trades/pending')
  async getPendingTrades(@Req() req: any) {
    return this.adminService.getPendingTrades();
  }
}
