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
import { User } from '../../user/entities/user.entity';

export enum TargetAudience {
  TOUS = 'Tous',
  ENSEIGNANTS = 'Enseignants',
  ETUDIANTS = 'Etudiants',
  PARENTS = 'Parents',
  COMPTABLES = 'Comptables',
}

@Entity()
export class Annonce {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  title!: string;

  @Column({ type: 'text' })
  @ApiProperty()
  content!: string;

  @Column({
    type: 'simple-array',
    default: [TargetAudience.TOUS],
  })
  @ApiProperty({ enum: TargetAudience, isArray: true })
  targetAudiences!: TargetAudience[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: false })
  createdById!: number;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
