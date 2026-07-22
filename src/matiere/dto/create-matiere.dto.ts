import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ArrayNotEmpty,
  Validate,
} from 'class-validator';
import { IsTiptapDocConstraint } from '../validators/is-tiptap-doc.validator';

export class CreateMatiereDto {
  @ApiProperty({ example: 'SI101', description: 'Code de la matière' })
  @IsString({ message: 'Le code doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le code est obligatoire' })
  code!: string;

  @ApiProperty({ example: 'Algorithmique', description: 'Nom de la matière' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({ example: 2.0, description: 'Coefficient de la matière' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Le coefficient doit être un nombre' })
  @IsNotEmpty({ message: 'Le coefficient est obligatoire' })
  coefficient!: number;

  @ApiProperty({ example: 32, description: 'Nombre d heures de la matière' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Le nombre d heures doit être un nombre' })
  @IsNotEmpty({ message: 'Le nombre d heures est obligatoire' })
  hours!: number;

  @ApiProperty({
    example: [1, 2],
    description: 'IDs des niveaux',
    type: [Number],
  })
  @IsArray({ message: 'Les IDs des niveaux doivent être un tableau' })
  @ArrayNotEmpty({ message: 'Au moins un niveau est requis' })
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Chaque ID de niveau doit être un nombre' })
  niveauIds!: number[];

  @ApiProperty({
    example: 'UE2.3',
    description: "Numéro de l'unité d'enseignement",
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le numéro UE doit être une chaîne de caractères' })
  @MaxLength(50, { message: 'Le numéro UE ne doit pas dépasser 50 caractères' })
  numeroUe?: string;

  @ApiProperty({
    example: { type: 'doc', content: [] },
    description: 'Éléments constitutifs (document Tiptap JSON)',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Les éléments constitutifs doivent être un objet JSON' })
  @Validate(IsTiptapDocConstraint)
  elementsConstitutifs?: Record<string, any>;

  @ApiProperty({ example: 12, description: 'Heures TP/TD', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'TP/TD doit être un nombre' })
  @Min(0, { message: 'TP/TD ne peut pas être négatif' })
  tpTd?: number;

  @ApiProperty({ example: 8, description: 'Heures TPE', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'TPE doit être un nombre' })
  @Min(0, { message: 'TPE ne peut pas être négatif' })
  tpe?: number;

  @ApiProperty({ example: 52, description: 'Volume horaire total', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'VHT doit être un nombre' })
  @Min(0, { message: 'VHT ne peut pas être négatif' })
  vht?: number;

  @ApiProperty({ example: 3.0, description: 'Crédits ECTS', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Les crédits doivent être un nombre' })
  @Min(0, { message: 'Les crédits ne peuvent pas être négatifs' })
  credits?: number;
}
