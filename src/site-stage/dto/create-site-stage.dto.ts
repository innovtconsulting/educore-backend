import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSiteStageDto {
  @ApiProperty({ example: 'Orange Senegal' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(255)
  nom!: string;

  @ApiPropertyOptional({ example: 'Route de Ouakam, Dakar' })
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional({ example: '+221 33 839 39 39' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: 'contact@orange.sn' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'M. Ndiaye' })
  @IsOptional()
  @IsString()
  responsable?: string;

  @ApiPropertyOptional({ example: 'Site principal de Orange Dakar' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'La capacité doit être un nombre' })
  @IsPositive()
  capacite?: number;
}
