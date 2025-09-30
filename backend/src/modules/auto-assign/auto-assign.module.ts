import { Module } from '@nestjs/common';
import { AutoAssignService } from './auto-assign.service';
import { AutoAssignController } from './auto-assign.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { LockersModule } from '../lockers/lockers.module';

@Module({
  imports: [PrismaModule, TariffsModule, LockersModule],
  providers: [AutoAssignService],
  controllers: [AutoAssignController],
  exports: [AutoAssignService],
})
export class AutoAssignModule {}


