import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StudentImportRowDto {
  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty()
  @IsString()
  className: string;

  @ApiProperty()
  @IsString()
  levelName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ConfirmImportDto {
  @ApiProperty({ type: [StudentImportRowDto] })
  students: StudentImportRowDto[];
}

export class EstablishmentToCreateDto {
  @ApiProperty()
  @IsString()
  acronyme: string;

  @ApiProperty()
  @IsString()
  name: string;
}

export class MissingClasseDto {
  @ApiProperty()
  niveauNom: string;

  @ApiProperty()
  classeNom: string;
}

export class CheckImportResultSheetDto {
  @ApiProperty()
  acronyme: string;

  @ApiProperty()
  existeDeja: boolean;

  @ApiProperty()
  nombreLignes: number;

  @ApiProperty()
  headers: string[];

  @ApiProperty({ type: [String] })
  niveauxManquants: string[];

  @ApiProperty({ type: [MissingClasseDto] })
  classesManquantes: MissingClasseDto[];
}

export class CheckImportResultDto {
  @ApiProperty({ type: [CheckImportResultSheetDto] })
  sheets: CheckImportResultSheetDto[];
}

export class RunImportDto {
  @ApiProperty({ type: [EstablishmentToCreateDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EstablishmentToCreateDto)
  etablissementsACreer?: EstablishmentToCreateDto[];

  @ApiProperty({
    required: false,
    description:
      "Si vrai, crée automatiquement une inscription (année universitaire active) pour chaque étudiant importé, au parcours et niveau indiqués dans le fichier Excel",
  })
  @IsBoolean()
  @IsOptional()
  inscrireAutomatiquement?: boolean;

  @ApiProperty({
    required: false,
    default: true,
    description:
      'Statut appliqué à tous les étudiants importés : true = Actif, false = Inactif',
  })
  @IsBoolean()
  @IsOptional()
  statutActif?: boolean;
}

export class ImportReportSheetDto {
  @ApiProperty()
  acronyme: string;

  @ApiProperty()
  nombreEtudiantsImportes: number;

  @ApiProperty()
  nombreErreurs: number;

  @ApiProperty({ type: [String] })
  erreurs: string[];

  @ApiProperty()
  aEteCree: boolean;
}

export class ImportReportDto {
  @ApiProperty({ type: [ImportReportSheetDto] })
  feuilles: ImportReportSheetDto[];

  @ApiProperty()
  totalEtudiantsImportes: number;

  @ApiProperty()
  totalErreurs: number;
}
