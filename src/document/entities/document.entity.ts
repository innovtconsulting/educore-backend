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

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
