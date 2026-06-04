import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMatiereDto {
  @ApiProperty({ example: 'INF101', description: 'Code de la matière' })
  @IsString({ message: 'Le code doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le code est obligatoire' })
  code: string;

  @ApiProperty({ example: 'Algorithmique', description: 'Nom de la matière' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name: string;

  @ApiProperty({ example: 2.0, description: 'Coefficient de la matière' })
  @IsNumber({}, { message: 'Le coefficient doit être un nombre' })
  @IsNotEmpty({ message: 'Le coefficient est obligatoire' })
  coefficient: number;

  @ApiProperty({ example: [1], description: "Liste des IDs des classes" })
  @IsArray({ message: 'Les classes doivent être fournies sous forme de tableau' })
  @ArrayNotEmpty({ message: 'Au moins une classe est obligatoire' })
  @IsNumber({}, { each: true, message: 'Chaque ID de classe doit être un nombre' })
  classeIds: number[];

  @ApiProperty({ example: [1], description: "Liste des IDs des niveaux" })
  @IsArray({ message: 'Les niveaux doivent être fournis sous forme de tableau' })
  @ArrayNotEmpty({ message: 'Au moins un niveau est obligatoire' })
  @IsNumber({}, { each: true, message: 'Chaque ID de niveau doit être un nombre' })
  niveauIds: number[];
}
