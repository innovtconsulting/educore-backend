import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'user@example.com', required: false, description: 'Email ou numéro de téléphone (pour les parents)' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'newpassword123', required: false })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: '+221 77 000 00 00', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Dakar, Plateau', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}
