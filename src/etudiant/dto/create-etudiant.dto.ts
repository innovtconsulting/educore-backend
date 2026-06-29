import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentStatus } from '../entities/etudiant.entity';
import { CreateParentDto } from '../../parent/dto/create-parent.dto';

export class CreateEtudiantDto {
  @ApiProperty({ example: 'Sow' })
  @IsString()
  @IsNotEmpty()
  lastName: string | undefined;

  @ApiProperty({ example: 'Ousmane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: '2005-05-15', required: false })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({ example: 'Dakar', required: false })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiProperty({ example: 'M', enum: ['M', 'F'], required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: 'ousmane.sow@email.sn', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '+221 77 000 00 00', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Dakar, Plateau', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Sénégalaise', required: false })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({ example: '123456789', required: false })
  @IsString()
  @IsOptional()
  cin?: string;

  @ApiProperty({ example: '2023-01-01', required: false })
  @IsDateString()
  @IsOptional()
  cinDeliveryDate?: string;

  @ApiProperty({ example: 'Dakar', required: false })
  @IsString()
  @IsOptional()
  cinDeliveryPlace?: string;

  // Documents fournis
  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  baccDiploma?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  residenceCertificate?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  birthCertificate?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  cinCopy?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  identityPhoto?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  transfertFile?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  cartonChemise?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  enveloppe?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  gant?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  alcohol?: boolean;

  @ApiProperty({
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIF,
    required: false,
  })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @ApiProperty({ example: 1, description: "ID de l'établissement (optionnel pour admin, déduit du token)", required: false })
  @IsNumber()
  @IsOptional()
  etablissementId?: number;

  @ApiProperty({ example: 1, description: 'ID de la classe' })
  @IsNumber()
  @IsNotEmpty()
  classeId!: number;

  @ApiProperty({ example: 1, description: 'ID du niveau' })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;

  @ApiProperty({
    type: [CreateParentDto],
    description: 'Données des parents/tuteurs',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateParentDto)
  parentsData?: CreateParentDto[];
}
