import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../user/entities/user.entity';
import { CreateEtudiantDto } from '../../etudiant/dto/create-etudiant.dto';
import { CreateEnseignantDto } from '../../enseignant/dto/create-enseignant.dto';
import { CreateParentDto } from '../../parent/dto/create-parent.dto';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    required: false,
    description:
      'Optionnel pour Etudiant (utilisé pour la pré-inscription). Pour les parents, le numéro de téléphone est utilisé.',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'password123'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ETUDIANT,
    description:
      "Rôle de l'utilisateur (Etudiant, Enseignant, Parent, Admin, Comptable, Surveillant)",
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @ApiProperty({
    type: CreateEtudiantDto,
    required: false,
    description: 'Données de pré-inscription pour un étudiant.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEtudiantDto)
  etudiantData?: CreateEtudiantDto;

  @ApiProperty({
    type: CreateEnseignantDto,
    required: false,
    description:
      "Non utilisé (les enseignants sont créés par l'administrateur).",
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
