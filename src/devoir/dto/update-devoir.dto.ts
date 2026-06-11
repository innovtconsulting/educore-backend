import { PartialType } from '@nestjs/swagger';
import { CreateDevoirDto } from './create-devoir.dto';

export class UpdateDevoirDto extends PartialType(CreateDevoirDto) {}
