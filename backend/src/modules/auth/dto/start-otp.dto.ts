import { IsPhoneNumber } from 'class-validator';

export class StartOtpDto {
  @IsPhoneNumber('RU')
  phone!: string;
}
