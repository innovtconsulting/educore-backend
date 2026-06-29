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
import { Permission } from './permission.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty({ example: 'Admin' })
  name!: string;

  @Column({ nullable: true })
  @ApiProperty({ example: "Administrateur de l'établissement" })
  description?: string;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @ManyToMany(() => Permission)
  @JoinTable({ name: 'role_permissions' })
  @ApiProperty({ type: () => [Permission] })
  permissions!: Permission[];
}
