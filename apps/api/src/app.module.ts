import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { InventoryModule } from './inventory/inventory.module';
import { GamesModule } from './games/games.module';
import { TradesModule } from './trades/trades.module';
import { AdminModule } from './admin/admin.module';
import { SocketModule } from './socket/socket.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CasesModule,
    InventoryModule,
    GamesModule,
    TradesModule,
    AdminModule,
    SocketModule,
    PaymentsModule,
  ],
})
export class AppModule {}
