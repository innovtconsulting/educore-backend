import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

export enum DocumentCategory {
  ADMINISTRATIF = 'Administratif',
  PEDAGOGIQUE = 'Pédagogique',
  REGLEMENT = 'Règlement',
  AUTRE = 'Autre',
}

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  title!: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  description?: string;

  @Column({
    type: 'varchar',
    default: DocumentCategory.AUTRE,
  })
  @ApiProperty({ enum: DocumentCategory })
  category!: DocumentCategory;

  @Column()
  @ApiProperty()
  filePath!: string;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  originalName!: string;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  mimeType!: string;

  @Column({ type: 'bigint', nullable: true })
  @ApiProperty({ required: false })
  fileSize!: number;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @ManyToMany(() => Classe)
  @JoinTable({ name: 'document_classes' })
  classes!: Classe[];

  @ManyToMany(() => Niveau)
  @JoinTable({ name: 'document_niveaux' })
  niveaux!: Niveau[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
