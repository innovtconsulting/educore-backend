import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteStageDto } from './create-site-stage.dto';

export class UpdateSiteStageDto extends PartialType(CreateSiteStageDto) {}
