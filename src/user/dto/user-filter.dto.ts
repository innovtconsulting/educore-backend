import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../entities/user.entity';

export class UserFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filtrer par rôle utilisateur',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filtrer par statut actif (true) ou inactif (false)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      "Filtrer par établissement (réservé au SuperAdmin sans tenant actif)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  etablissementId?: number;
}
