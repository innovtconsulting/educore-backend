import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/paiement.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0.01)
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
