import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { ParentGender } from '../entities/parent.entity';

export class CreateParentDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'Père', enum: ParentGender })
  @IsEnum(ParentGender)
  gender!: ParentGender;

  @ApiProperty({ example: 'jean.dupont@email.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+221 77 123 45 67' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ example: 'Dakar, Plateau', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Ingénieur', required: false })
  @IsString()
  @IsOptional()
  job?: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  etablissementId?: number;
}
