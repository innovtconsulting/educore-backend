import { PartialType } from '@nestjs/swagger';
import { CreateAnneeUniversitaireDto } from './create-annee-universitaire.dto';

export class UpdateAnneeUniversitaireDto extends PartialType(
  CreateAnneeUniversitaireDto,
) {}
