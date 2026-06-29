import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
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

  @ApiProperty({ example: 1, description: 'ID de l\'établissement' })
  @IsNumber()
  @IsNotEmpty()
  etablissementId!: number;
}
