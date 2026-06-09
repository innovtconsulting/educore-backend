import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateEtablissementDto {
  @ApiProperty({ example: 'Lycée Excellence' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  name!: string;

  @ApiProperty({ example: 'Dakar, Sénégal' })
  @IsString({ message: "L'adresse doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'adresse est obligatoire" })
  address!: string;

  @ApiProperty({ example: 'contact@lycee.sn' })
  @IsEmail({}, { message: "L'email doit être une adresse email valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email!: string;

  @ApiProperty({ example: '+221 33 000 00 00' })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  phone!: string;
}
