import { Controller, Get, Post, Query, Body, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { DeviceService } from './device.service';

@Controller('api/device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * GET /api/device/poll?device_id=ESP32_001&token=SECRET
   * ESP32 polls for pending commands
   */
  @Get('poll')
  async poll(
    @Query('device_id') deviceId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!deviceId || !token) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing device_id or token');
    }

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

  /**
   * POST /api/device/confirm?device_id=ESP32_001&token=SECRET
   * Body: { "locker_number": 5 }
   * ESP32 confirms command execution
   */
  @Post('confirm')
  async confirm(
    @Query('device_id') deviceId: string,
    @Query('token') token: string,
    @Body('locker_number') lockerNumber: number,
    @Res() res: Response,
  ) {
    if (!deviceId || !token) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing device_id or token');
    }

    if (!lockerNumber && lockerNumber !== 0) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing locker_number in body');
    }

    try {
      await this.deviceService.confirmCommand(deviceId, token, lockerNumber);
      return res.send('OK');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(HttpStatus.BAD_REQUEST).send(errorMessage);
    }
  }
}
