import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { BulkRecordPresenceDto } from './dto/record-presence.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('presence')
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('bulk')
  @ApiOperation({
    summary: 'Enregistrer les présences pour une session (en masse)',
  })
  bulkRecord(@Body() bulkRecordPresenceDto: BulkRecordPresenceDto) {
    return this.presenceService.bulkRecord(bulkRecordPresenceDto);
  }

  @Get('session/:id')
  @ApiOperation({ summary: "Récupérer les présences d'un créneau spécifique" })
  findBySession(@Param('id', ParseIntPipe) id: number) {
    return this.presenceService.findBySession(id);
  }

  @Get('etudiant/:id')
  @ApiOperation({
    summary: "Statistiques et historique de présence d'un étudiant",
  })
  getStudentStats(@Param('id', ParseIntPipe) id: number) {
    return this.presenceService.getStudentStats(id);
  }
}
