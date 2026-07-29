import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateLigneStageDto {
  @ApiPropertyOptional({
    description:
      "ID du nouvel étudiant assigné à la ligne (null pour désaffecter)",
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  etudiantId?: number | null;
}
