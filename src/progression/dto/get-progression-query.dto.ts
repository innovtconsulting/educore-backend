import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class GetProgressionQueryDto {
  @ApiProperty({ description: 'ID du niveau' })
  @Type(() => Number)
  @IsInt({ message: "L'ID du niveau doit être un nombre" })
  @IsNotEmpty({ message: 'Le niveau est obligatoire' })
  niveauId!: number;
}
