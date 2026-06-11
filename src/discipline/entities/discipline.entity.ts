import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({ example: 'Le port de la blouse est obligatoire dans les laboratoires.' })
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

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
