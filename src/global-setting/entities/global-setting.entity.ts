import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SettingCategory {
  ACADEMIC = 'ACADEMIC',
  FINANCIAL = 'FINANCIAL',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
}

@Entity()
export class GlobalSetting {
  @PrimaryColumn()
  @ApiProperty({
    description: 'Clé unique du paramètre (ex: ACADEMIC_PASSING_GRADE)',
  })
  key!: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Valeur du paramètre stockée en string' })
  value!: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: "Description de l'utilité du paramètre" })
  description?: string;

  @Column({
    type: 'enum',
    enum: SettingCategory,
    default: SettingCategory.SYSTEM,
  })
  @ApiProperty({ enum: SettingCategory })
  category!: SettingCategory;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
