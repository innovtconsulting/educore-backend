import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum SettingCategory {
  ACADEMIC = 'ACADEMIC',
  FINANCIAL = 'FINANCIAL',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
}

@Entity()
@Unique(['key', 'etablissementId']) // Unique key per etablissement
export class GlobalSetting {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'ID unique du paramètre' })
  id!: number;

  @Column()
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

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
