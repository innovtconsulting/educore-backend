import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisciplineCategory } from '../entities/discipline.entity';

export class CreateDisciplineDto {
  @ApiProperty({ example: 'Retard et Absences' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example:
      'Tout retard de plus de 15 minutes est considéré comme une absence.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    enum: DisciplineCategory,
    default: DisciplineCategory.DISCIPLINE,
  })
  @IsEnum(DisciplineCategory)
  @IsOptional()
  category?: DisciplineCategory;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
