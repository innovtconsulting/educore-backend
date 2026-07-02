import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiProperty({
    description: 'Si true, supprime le fichier physique associé au document',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteFile?: boolean;
}
