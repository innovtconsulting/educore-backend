import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: 1, description: 'ID du document uploadé' })
  @IsNumber()
  @IsNotEmpty()
  documentId: number;

  @ApiProperty({ example: 'Voici mon rendu pour le TP.', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
