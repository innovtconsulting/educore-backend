import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DepenseCategory } from '../entities/depense.entity';

export class CreateDepenseDto {
  @ApiProperty({ enum: DepenseCategory, default: DepenseCategory.AUTRE })
  @IsEnum(DepenseCategory)
  category!: DepenseCategory;

  @ApiProperty({ example: 'Réparation plomberie bâtiment A', required: false })
  @IsString()
  @IsOptional()
  libelle?: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-07-02' })
  @IsDateString()
  date!: string;
}
