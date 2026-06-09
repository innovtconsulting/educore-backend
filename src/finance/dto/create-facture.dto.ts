import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '../entities/facture.entity';

export class CreateFactureDto {
  @ApiProperty({ example: 'FAC-2026-0001' })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({ example: '2026-06-09' })
  @IsDateString()
  @IsNotEmpty()
  dateEmission!: string;

  @ApiProperty({ example: '2026-07-09', required: false })
  @IsDateString()
  @IsOptional()
  dateEcheance?: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  montantTotal!: number;

  @ApiProperty({ enum: InvoiceStatus, default: InvoiceStatus.BROUILLON })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({ example: 'Notes additionnelles', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
