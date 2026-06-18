import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateNoteDto {
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

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  evaluationId!: number;
}
