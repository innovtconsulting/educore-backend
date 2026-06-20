import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'STUDENT_EXPORT' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'Le nom doit être en MAJUSCULES avec underscores (ex: STUDENT_EXPORT)',
  })
  name!: string;

  @ApiPropertyOptional({ example: 'Permet d exporter la liste des étudiants' })
  @IsString()
  @IsOptional()
  description?: string;
}
