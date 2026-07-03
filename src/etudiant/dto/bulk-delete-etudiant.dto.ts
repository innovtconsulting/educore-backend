import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class BulkDeleteEtudiantDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids!: number[];
}
