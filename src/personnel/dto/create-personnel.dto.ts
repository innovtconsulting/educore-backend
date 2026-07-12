import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePersonnelDto {
  @ApiProperty({ example: 'Jean Rakoto' })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiProperty({ example: 'Professeur', required: false })
  @IsString()
  @IsOptional()
  poste?: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  salaireMensuel!: number;

  @ApiProperty({ example: 1, required: false, description: "ID de l'utilisateur lié (optionnel)" })
  @IsNumber()
  @IsOptional()
  userId?: number;
}
