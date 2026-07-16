import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateClasseDto {
  @ApiProperty({ example: 'Soins Infirmiers' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({
    example: 1,
    description: "ID de l'établissement",
  })
  @IsNumber({}, { message: "L'ID de l'établissement doit être un nombre" })
  @IsNotEmpty({ message: "L'ID de l'établissement est obligatoire" })
  etablissementId!: number;
}
