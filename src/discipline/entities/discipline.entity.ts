import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum DisciplineCategory {
  REGLEMENT_INTERIEUR = 'Règlement Intérieur',
  DISCIPLINE = 'Discipline',
  AUTRE = 'Autre',
}

@Entity()
export class Discipline {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty({ example: 'Tenue Vestimentaire' })
  title!: string;

  @Column({ type: 'text' })
  @ApiProperty({
    example: 'Le port de la blouse est obligatoire dans les laboratoires.',
  })
  content!: string;

  @Column({
    type: 'enum',
    enum: DisciplineCategory,
    default: DisciplineCategory.DISCIPLINE,
  })
  @ApiProperty({ enum: DisciplineCategory })
  category!: DisciplineCategory;

  @Column({ default: true })
  @ApiProperty({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: true })
  etablissementId!: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
