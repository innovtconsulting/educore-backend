import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkNoteItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @Min(0)
  @Max(20)
  @IsNotEmpty()
  value!: number;

  @ApiProperty({ example: 'Bon travail', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class BulkCreateNoteDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  evaluationId!: number;

  @ApiProperty({ type: [BulkNoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkNoteItemDto)
  items!: BulkNoteItemDto[];
}
