import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { CasesService } from './cases.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/cases')
export class CasesController {
  constructor(private casesService: CasesService) {}

  @Get()
  async getCases() {
    return this.casesService.getAllCases();
  }

  @Get(':slug')
  async getCase(@Param('slug') slug: string) {
    return this.casesService.getCaseBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/open')
  async openCase(
    @Param('slug') slug: string,
    @Req() req: any,
    @Body('clientSeed') clientSeed?: string,
  ) {
    return this.casesService.openCase(req.user.id, slug, clientSeed);
  }
}
