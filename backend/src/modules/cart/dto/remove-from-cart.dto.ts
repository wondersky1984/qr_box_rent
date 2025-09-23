import { IsUUID } from 'class-validator';

export class RemoveFromCartDto {
  @IsUUID()
  lockerId!: string;
}
