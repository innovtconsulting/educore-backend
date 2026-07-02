import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePeriodeStageDto {
  @ApiProperty({ example: 'Stage de fin de cycle 2026-2027' })
  @IsString({ message: 'Le libellé doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le libellé est obligatoire' })
  @MaxLength(255)
  libelle!: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString({}, { message: 'La date de début est invalide' })
  @IsNotEmpty({ message: 'La date de début est obligatoire' })
  dateDebut!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString({}, { message: 'La date de fin est invalide' })
  @IsNotEmpty({ message: 'La date de fin est obligatoire' })
  dateFin!: string;

  @ApiProperty({ example: 1, description: 'ID de l\'année universitaire' })
  @IsNumber({}, { message: 'L\'ID de l\'année universitaire doit être un nombre' })
  @IsNotEmpty({ message: 'L\'année universitaire est obligatoire' })
  anneeUniversitaireId!: number;
}
