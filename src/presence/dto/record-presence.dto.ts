import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PresenceStatus } from '../entities/presence.entity';

export class RecordPresenceItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId: number;

  @ApiProperty({ example: 'Présent', enum: PresenceStatus })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;

  @ApiProperty({ example: 'Arrivé avec 5min de retard', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class BulkRecordPresenceDto {
  @ApiProperty({ example: 1, description: "ID du créneau d'emploi du temps" })
  @IsNumber()
  @IsNotEmpty()
  emploiDuTempId: number;

  @ApiProperty({ type: [RecordPresenceItemDto] })
  @ValidateNested({ each: true })
  @Type(() => RecordPresenceItemDto)
  items: RecordPresenceItemDto[];
}
