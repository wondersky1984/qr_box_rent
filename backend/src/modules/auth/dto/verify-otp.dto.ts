import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('RU')
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}
