import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAffectationDto {
  @ApiProperty({ example: 1, description: 'ID de la matière' })
  @IsNumber()
  @IsNotEmpty()
  matiereId!: number;

  @ApiProperty({
    example: 1,
    description: "ID de l'établissement (optionnel si extrait du token)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  etablissementId?: number;

  @ApiProperty({ example: 1, description: 'ID du niveau' })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;
}
