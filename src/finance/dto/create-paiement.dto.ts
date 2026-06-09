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
import { PaymentMethod } from '../entities/paiement.entity';

export class CreatePaiementDto {
  @ApiProperty({ example: 'PAY-2026-0001' })
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  factureId?: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  montant!: number;

  @ApiProperty({ example: '2026-06-09' })
  @IsDateString()
  @IsNotEmpty()
  datePaiement!: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.ESPECES })
  @IsEnum(PaymentMethod)
  @IsOptional()
  modePaiement?: PaymentMethod;
}
