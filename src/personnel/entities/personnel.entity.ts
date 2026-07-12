import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { PaiePersonnel } from './paie-personnel.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Personnel {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  nom!: string;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  poste?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  salaireMensuel!: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  @ApiProperty({ type: () => User, required: false })
  user?: User;

  @Column({ nullable: true, unique: true })
  userId?: number;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @OneToMany(() => PaiePersonnel, (paie) => paie.personnel)
  paies!: PaiePersonnel[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
