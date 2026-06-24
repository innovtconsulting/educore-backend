import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission.dto';

export class UpdatePermissionDto extends PartialType(
  OmitType(CreatePermissionDto, ['name'] as const),
) {}
