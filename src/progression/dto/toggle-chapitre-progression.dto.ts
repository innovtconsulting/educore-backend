import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty } from 'class-validator';

export class ToggleChapitreProgressionDto {
  @ApiProperty({ description: 'ID du niveau' })
  @Type(() => Number)
  @IsInt({ message: "L'ID du niveau doit être un nombre" })
  @IsNotEmpty({ message: 'Le niveau est obligatoire' })
  niveauId!: number;

  @ApiProperty({ description: 'Chapitre terminé ou non' })
  @IsBoolean({ message: 'completed doit être un booléen' })
  @IsNotEmpty({ message: 'completed est obligatoire' })
  completed!: boolean;
}
