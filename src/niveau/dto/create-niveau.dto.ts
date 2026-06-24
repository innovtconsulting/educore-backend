import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateNiveauDto {
  @ApiProperty({ example: 'L1, ect...' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({
    example: 1,
    description: 'ID du parcours (classe)',
  })
  @IsNumber({}, { message: 'L\'ID du parcours doit être un nombre' })
  @IsNotEmpty({ message: 'L\'ID du parcours est obligatoire' })
  parcoursId!: number;
}
