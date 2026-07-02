import { PartialType } from '@nestjs/mapped-types';
import { CreatePeriodeStageDto } from './create-periode-stage.dto';

export class UpdatePeriodeStageDto extends PartialType(CreatePeriodeStageDto) {}
