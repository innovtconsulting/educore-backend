import { PartialType } from '@nestjs/swagger';
import { CreateEtudiantDto } from './create-etudiant.dto';

export class UpdateEtudiantDto extends PartialType(CreateEtudiantDto) {}
