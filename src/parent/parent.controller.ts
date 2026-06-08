import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('parents')
@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau parent' })
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentService.create(createParentDto);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Lister les contacts des parents' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Recherche par nom parent ou étudiant, ou matricule',
  })
  getContacts(@Query('search') search?: string) {
    return this.parentService.getContacts(search);
  }

  @Get()
  @ApiOperation({ summary: 'Liste de tous les parents' })
  findAll() {
    return this.parentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un parent' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un parent' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentService.update(id, updateParentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un parent' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.remove(id);
  }
}
