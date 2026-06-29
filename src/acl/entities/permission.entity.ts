import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty({ example: 'STUDENT_CREATE' })
  name!: string;

  @Column({ nullable: true })
  @ApiProperty({ example: 'Permet de créer un étudiant' })
  description?: string;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;
}
