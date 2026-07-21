import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@ecole.fr', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: '+221 77 000 00 00',
    required: false,
    description: 'Identifiant de connexion alternatif (Admin/Comptable/Monitrice)',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'adminuser', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    example: 1,
    required: false,
    description:
      "ID de l'établissement (requis pour les rôles autres que SUPER_ADMIN)",
  })
  @IsNumber()
  @IsOptional()
  etablissementId?: number;
}
