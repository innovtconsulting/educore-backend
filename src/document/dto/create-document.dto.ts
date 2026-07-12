import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DocumentCategory } from '../entities/document.entity';
import { ScheduleScopeDto } from '../../emploi-du-temps/dto/create-evenement.dto';

const parseJsonIfString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

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

  @ApiPropertyOptional({ description: "Vise tout l'établissement (ignore scopes)" })
  @Transform(parseJsonIfString)
  @IsBoolean()
  @IsOptional()
  allEtablissement?: boolean;

  @ApiPropertyOptional({
    type: [ScheduleScopeDto],
    description: 'Parcours/niveaux ciblés (requis si allEtablissement=false) — envoyé en JSON stringifié en multipart',
  })
  @Transform(parseJsonIfString)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleScopeDto)
  @IsOptional()
  scopes?: ScheduleScopeDto[];
}
