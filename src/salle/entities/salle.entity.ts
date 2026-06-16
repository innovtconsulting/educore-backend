import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Salle {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty({ example: 'Salle 101' })
  name!: string;

  @Column({ nullable: true })
  @ApiProperty({ example: 'Bâtiment A, 1er étage', required: false })
  location?: string;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ example: 40, required: false })
  capacity?: number;

  @ManyToOne(() => Etablissement, { onDelete: 'CASCADE', nullable: false })
  @ApiProperty({ type: () => Etablissement })
  etablissement!: Etablissement;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
