import { IsObject, IsString } from 'class-validator';

export class PaymentsWebhookDto {
  @IsString()
  event!: string;

  @IsObject()
  object!: Record<string, any>;
}
