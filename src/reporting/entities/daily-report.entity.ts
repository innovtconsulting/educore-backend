import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class DailyReport {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'date', unique: true })
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

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
