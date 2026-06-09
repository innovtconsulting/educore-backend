import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitDailyReportDto {
  @ApiProperty({ description: 'Date du rapport (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ description: 'Nom du surveillant' })
  @IsString()
  @IsNotEmpty()
  supervisorName!: string;

  @ApiProperty({ description: 'Observations générales', required: false })
  @IsString()
  @IsOptional()
  observations?: string;
}
