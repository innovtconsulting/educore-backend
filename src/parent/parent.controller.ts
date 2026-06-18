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
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Post()
  @Permissions('STUDENT_CREATE')
  @ApiOperation({ summary: 'Créer un nouveau parent' })
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentService.create(createParentDto);
  }

  @Get('contacts')
  @Permissions('STUDENT_VIEW')
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
  @Permissions('STUDENT_VIEW')
  @ApiOperation({ summary: 'Liste de tous les parents' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.parentService.findAll(paginationQuery);
  }

  @Get(':id')
  @Permissions('STUDENT_VIEW')
  @ApiOperation({ summary: "Détails d'un parent" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.findOne(id);
  }

  @Patch(':id')
  @Permissions('STUDENT_EDIT')
  @ApiOperation({ summary: 'Modifier un parent' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentService.update(id, updateParentDto);
  }

  @Delete(':id')
  @Permissions('STUDENT_EDIT')
  @ApiOperation({ summary: 'Supprimer un parent' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.remove(id);
  }
}
