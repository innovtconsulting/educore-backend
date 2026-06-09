import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateClasseDto {
  @ApiProperty({ example: 'Informatique' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({
    example: [1, 2],
    description: 'Liste des IDs des niveaux (ex: L1, L2)',
  })
  @IsArray({
    message: 'Les niveaux doivent être fournis sous forme de tableau',
  })
  @ArrayNotEmpty({ message: 'Au moins un niveau est obligatoire' })
  @IsNumber(
    {},
    { each: true, message: 'Chaque ID de niveau doit être un nombre' },
  )
  niveauIds!: number[];

  @ApiProperty({
    example: [1],
    description: 'Liste des IDs des établissements',
  })
  @IsArray({
    message: 'Les établissements doivent être fournis sous forme de tableau',
  })
  @ArrayNotEmpty({ message: 'Au moins un établissement est obligatoire' })
  @IsNumber(
    {},
    { each: true, message: 'Chaque ID d établissement doit être un nombre' },
  )
  etablissementIds!: number[];
}
