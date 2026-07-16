import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAffectationStageDto {
  @ApiProperty({ example: 1, description: 'ID de l\'étudiant' })
  @IsNumber({}, { message: 'L\'ID de l\'étudiant doit être un nombre' })
  @IsNotEmpty({ message: 'L\'étudiant est obligatoire' })
  etudiantId!: number;

  @ApiProperty({ example: 1, description: 'ID du site de stage' })
  @IsNumber({}, { message: 'L\'ID du site de stage doit être un nombre' })
  @IsNotEmpty({ message: 'Le site de stage est obligatoire' })
  siteStageId!: number;

  @ApiProperty({ example: 1, description: 'ID de la période de stage' })
  @IsNumber({}, { message: 'L\'ID de la période de stage doit être un nombre' })
  @IsNotEmpty({ message: 'La période de stage est obligatoire' })
  periodeStageId!: number;

  @ApiPropertyOptional({ example: 'Maternité', description: 'Service au sein du site' })
  @IsOptional()
  @IsString({ message: 'Le service doit être une chaîne de caractères' })
  service?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la nature de stage' })
  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de la nature de stage doit être un nombre' })
  natureStageId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de l\'enseignant tuteur (optionnel)' })
  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de l\'enseignant doit être un nombre' })
  enseignantId?: number;
}
