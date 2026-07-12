import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEnseignantDto {
  @ApiProperty({ example: 'Jean', description: "Prénom de l'enseignant" })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Dupont', description: "Nom de l'enseignant" })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'jean.dupont@email.com',
    description: "Email unique de l'enseignant",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '+221770000000',
    description: "Téléphone de l'enseignant",
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'ENS-2026-001',
    description: "Matricule unique de l'enseignant",
  })
  @IsString()
  @IsNotEmpty()
  matricule!: string;

  @ApiProperty({ example: '2026-06-08', description: "Date d'embauche" })
  @IsDateString()
  @IsNotEmpty()
  dateEmbauche!: string;

  @ApiProperty({
    example: 1,
    description: "ID de l'établissement (optionnel si extrait du token)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  etablissementId?: number;

  @ApiProperty({ default: false, required: false, description: 'Fiche de prof' })
  @IsBoolean()
  @IsOptional()
  ficheProf?: boolean;

  @ApiProperty({ default: false, required: false, description: 'CV' })
  @IsBoolean()
  @IsOptional()
  cv?: boolean;

  @ApiProperty({ default: false, required: false, description: 'Photocopie Diplôme' })
  @IsBoolean()
  @IsOptional()
  photocopieDiplome?: boolean;

  @ApiProperty({ default: false, required: false, description: 'Photocopie CIN' })
  @IsBoolean()
  @IsOptional()
  photocopieCin?: boolean;

  @ApiProperty({ default: false, required: false, description: 'Contrat de consultance' })
  @IsBoolean()
  @IsOptional()
  contratConsultance?: boolean;

  @ApiProperty({ default: false, required: false, description: 'Lettre de motivation' })
  @IsBoolean()
  @IsOptional()
  lettreMotivation?: boolean;
}
