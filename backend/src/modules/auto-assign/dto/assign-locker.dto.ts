import { IsString, IsNotEmpty } from 'class-validator';

export class AssignLockerDto {
  @IsString()
  @IsNotEmpty()
  tariffId!: string;
}
