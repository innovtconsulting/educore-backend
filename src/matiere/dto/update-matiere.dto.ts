import { PartialType } from '@nestjs/swagger';
import { CreateMatiereDto } from './create-matiere.dto';

export class UpdateMatiereDto extends PartialType(CreateMatiereDto) {}
