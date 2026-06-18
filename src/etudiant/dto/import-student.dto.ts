import { IsString, IsEmail, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentImportRowDto {
  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty()
  @IsString()
  className: string;

  @ApiProperty()
  @IsString()
  levelName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ConfirmImportDto {
  @ApiProperty({ type: [StudentImportRowDto] })
  students: StudentImportRowDto[];
}
