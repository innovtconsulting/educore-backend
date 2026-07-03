import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DocumentCategory } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Règlement Intérieur 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: "Le règlement intérieur pour l'année académique 2026",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DocumentCategory, example: DocumentCategory.REGLEMENT })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  classeId?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  niveauId?: number;
}
