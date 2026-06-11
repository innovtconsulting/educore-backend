import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../user/entities/user.entity';
import { CreateEtudiantDto } from '../../etudiant/dto/create-etudiant.dto';
import { CreateEnseignantDto } from '../../enseignant/dto/create-enseignant.dto';
import { CreateParentDto } from '../../parent/dto/create-parent.dto';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: Role,
    example: Role.ETUDIANT,
    description: "Rôle de l'utilisateur (Etudiant, Enseignant, Parent)",
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({ type: CreateEtudiantDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEtudiantDto)
  etudiantData?: CreateEtudiantDto;

  @ApiProperty({ type: CreateEnseignantDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEnseignantDto)
  enseignantData?: CreateEnseignantDto;

  @ApiProperty({ type: CreateParentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateParentDto)
  parentData?: CreateParentDto;
}
