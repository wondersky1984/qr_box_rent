import { Controller, Get } from '@nestjs/common';
import { TariffsService } from './tariffs.service';

@Controller('api/tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  list() {
    return this.tariffsService.listActive();
  }
}
