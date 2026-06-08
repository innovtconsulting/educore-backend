import { PartialType } from '@nestjs/swagger';
import { CreateEnseignantDto } from './create-enseignant.dto';

export class UpdateEnseignantDto extends PartialType(CreateEnseignantDto) {}
