import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DeviceService } from './device.service';

@Controller('api/device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get('poll')
  async poll(
    @Query('device_id') deviceId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const result = await this.deviceService.pollDevice(deviceId, token);
    
    if (result === 'OK') {
      return res.send('OK');
    }
    
    if (typeof result === 'string' && result.startsWith('OPEN')) {
      return res.send(result);
    }
    
    if (typeof result === 'object' && result.open) {
      return res.json(result);
    }
    
    return res.send('OK');
  }
}
