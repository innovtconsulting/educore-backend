import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('note')
@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Enregistrer une note', 
    description: 'Attribue une note à un étudiant pour une évaluation spécifique.' 
  })
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.noteService.create(createNoteDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les notes', 
    description: 'Récupère la liste de toutes les notes saisies dans le système.' 
  })
  findAll() {
    return this.noteService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une note par ID', 
    description: 'Affiche les détails d\'une note individuelle.' 
  })
  findOne(@Param('id') id: string) {
    return this.noteService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier une note', 
    description: 'Permet de corriger la valeur d\'une note déjà saisie.' 
  })
  update(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto) {
    return this.noteService.update(+id, updateNoteDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une note', 
    description: 'Supprime une note du système.' 
  })
  remove(@Param('id') id: string) {
    return this.noteService.remove(+id);
  }
}
