import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateJournalDto } from './create-journal.dto';

export class UpdateJournalDto extends PartialType(
  OmitType(CreateJournalDto, ['emploiDuTempId'] as const),
) {}
