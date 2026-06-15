import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Parent } from '../../parent/entities/parent.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum Role {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  ENSEIGNANT = 'Enseignant',
  ETUDIANT = 'Etudiant',
  PARENT = 'Parent',
  COMPTABLE = 'Comptable',
  SURVEILLANT = 'Surveillant',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty()
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.ETUDIANT,
  })
  @ApiProperty({ enum: Role })
  role!: Role;

  @Column({ default: true })
  @ApiProperty()
  isActive!: boolean;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @OneToOne(() => Enseignant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  enseignant?: Enseignant;

  @OneToOne(() => Etudiant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  etudiant?: Etudiant;

  @OneToOne(() => Parent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  parent?: Parent;

  @Column({ nullable: true })
  @Exclude()
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetPasswordExpires?: Date;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
