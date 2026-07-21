import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateInscriptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({
    example: 2,
    description: 'ID de la nouvelle année universitaire',
  })
  @IsNumber()
  @IsNotEmpty()
  anneeUniversitaireId!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  classeId!: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;

  @ApiProperty({
    example: 5,
    description: 'ID du site de stage (optionnel)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  siteStageId?: number;
}
