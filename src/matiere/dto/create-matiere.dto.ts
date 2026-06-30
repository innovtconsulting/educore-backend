import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMatiereDto {
  @ApiProperty({ example: 'INF101', description: 'Code de la matière' })
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
    example: 1,
    description: 'ID du niveau',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'L\'ID du niveau doit être un nombre' })
  @IsNotEmpty({ message: 'L\'ID du niveau est obligatoire' })
  niveauId!: number;
}
