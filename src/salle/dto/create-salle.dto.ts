import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSalleDto {
  @ApiProperty({ example: 'Salle 101' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Bâtiment A, 1er étage' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etablissementId: number;
}
