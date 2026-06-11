import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class ValidateEtudiantDto {
  @ApiProperty({
    example: 'ETU-2026-001',
    description: "Matricule attribué par l'administration",
  })
  @IsString()
  @IsNotEmpty()
  matricule!: string;

  @ApiProperty({
    example: true,
    description: 'Le diplôme du Bac est-il fourni ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  baccDiploma?: boolean;

  @ApiProperty({
    example: true,
    description: 'Le certificat de résidence est-il fourni ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  residenceCertificate?: boolean;

  @ApiProperty({
    example: true,
    description: "L'extrait de naissance est-il fourni ?",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  birthCertificate?: boolean;

  @ApiProperty({
    example: true,
    description: 'La copie de la CIN est-elle fournie ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cinCopy?: boolean;

  @ApiProperty({
    example: true,
    description: "La photo d'identité est-elle fournie ?",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  identityPhoto?: boolean;

  @ApiProperty({
    example: false,
    description: 'Le dossier de transfert est-il fourni ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  transfertFile?: boolean;

  @ApiProperty({
    example: true,
    description: 'Le carton chemise est-il fourni ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cartonChemise?: boolean;

  @ApiProperty({
    example: true,
    description: "L'enveloppe est-elle fournie ?",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  enveloppe?: boolean;

  @ApiProperty({
    example: true,
    description: 'Les gants sont-ils fournis ?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  gant?: boolean;

  @ApiProperty({
    example: true,
    description: "L'alcool est-il fourni ?",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  alcohol?: boolean;
}
