import { PartialType } from '@nestjs/swagger';
import { CreateEmploiDuTempDto } from './create-emploi-du-temp.dto';

export class UpdateEmploiDuTempDto extends PartialType(CreateEmploiDuTempDto) {}
