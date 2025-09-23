import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';
import { AdminTariffsController } from './tariffs.admin.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [TariffsService],
  controllers: [TariffsController, AdminTariffsController],
  exports: [TariffsService],
})
export class TariffsModule {}
