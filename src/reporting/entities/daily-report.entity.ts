import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
@Index(['date', 'etablissement'], { unique: true })
export class DailyReport {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  date!: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  observations?: string;

  @Column({ type: 'varchar' })
  @ApiProperty()
  supervisorName!: string;

  @Column({ type: 'int', default: 0 })
  @ApiProperty()
  totalAbsences!: number;

  @Column({ type: 'int', default: 0 })
  @ApiProperty()
  totalRetards!: number;

  @Column({ type: 'int', default: 0 })
  @ApiProperty()
  totalSanctions!: number;

  @Column({ default: false })
  @ApiProperty()
  isSubmitted!: boolean;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  pdfUrl?: string;

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
