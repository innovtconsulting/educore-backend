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
  UseGuards,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau parent' })
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentService.create(createParentDto);
  }

  @Get('contacts')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Liste de tous les parents' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.parentService.findAll(paginationQuery);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: "Détails d'un parent" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un parent' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentService.update(id, updateParentDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un parent' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.remove(id);
  }
}
