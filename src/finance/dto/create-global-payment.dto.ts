import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../entities/paiement.entity';

export class PaymentAllocationItem {
  @ApiProperty({ description: 'ID de la facture' })
  @IsNumber()
  factureId!: number;

  @ApiProperty({ description: 'Montant alloué à cette facture' })
  @IsNumber()
  @Min(0.01)
  montant!: number;
}

export class CreateGlobalPaymentDto {
  @ApiProperty({ type: [PaymentAllocationItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationItem)
  allocations!: PaymentAllocationItem[];

  @ApiProperty({ example: '2026-06-09' })
  @IsDateString()
  @IsNotEmpty()
  datePaiement!: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.ESPECES })
  @IsEnum(PaymentMethod)
  @IsOptional()
  modePaiement?: PaymentMethod;
}
