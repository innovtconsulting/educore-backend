import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../user/entities/user.entity';
import { CreateEtudiantDto } from '../../etudiant/dto/create-etudiant.dto';
import { CreateEnseignantDto } from '../../enseignant/dto/create-enseignant.dto';
import { CreateParentDto } from '../../parent/dto/create-parent.dto';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    required: false,
    description:
      "Optionnel pour Etudiant/Enseignant (récupéré via matricule). Obligatoire pour les autres.",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: Role,
    example: Role.ETUDIANT,
    description: "Rôle de l'utilisateur (Etudiant, Enseignant, Parent)",
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({
    example: 'ETU-2026-001',
    required: false,
    description: "Obligatoire pour les rôles Etudiant et Enseignant. Sert à l'activation du compte.",
  })
  @IsString()
  @IsOptional()
  matricule?: string;

  @ApiProperty({
    type: CreateEtudiantDto,
    required: false,
    description: 'Non utilisé pour le rôle Etudiant (utilisez le matricule).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEtudiantDto)
  etudiantData?: CreateEtudiantDto;

  @ApiProperty({
    type: CreateEnseignantDto,
    required: false,
    description: 'Non utilisé pour le rôle Enseignant (utilisez le matricule).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEnseignantDto)
  enseignantData?: CreateEnseignantDto;

  @ApiProperty({ type: CreateParentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateParentDto)
  parentData?: CreateParentDto;
}
