import { PartialType } from '@nestjs/swagger';
import { CreateSemestreDto } from './create-semestre.dto';

export class UpdateSemestreDto extends PartialType(CreateSemestreDto) {}
