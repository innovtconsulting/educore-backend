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
import { Role as AclRole } from '../../acl/entities/role.entity';

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  ENSEIGNANT = 'Enseignant',
  ETUDIANT = 'Etudiant',
  PARENT = 'Parent',
  COMPTABLE = 'Comptable',
  MONITRICE = 'Monitrice',
}

export { UserRole as Role };
export { UserRole as UserUserRole };

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @ApiProperty()
  email: string | null;

  // Uniquement utilisé comme identifiant de connexion alternatif pour les
  // comptes sans profil lié (Admin, SuperAdmin, Comptable, Monitrice) —
  // pour Etudiant/Enseignant/Parent, le numéro de téléphone vit sur leur
  // profil respectif (etudiant.phoneNumber, enseignant.phone, parent.phoneNumber).
  @Column({ type: 'varchar', unique: true, nullable: true })
  @ApiProperty({ required: false })
  phoneNumber?: string | null;

  @Column({ nullable: true })
  @ApiProperty()
  username?: string;

  @Column({ nullable: true })
  @Exclude()
  password?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ETUDIANT,
  })
  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @Column({ default: true })
  @ApiProperty()
  isActive!: boolean;

  @Column({ nullable: true })
  @ApiProperty()
  photoPath?: string;

  @ManyToOne(() => Etablissement, { nullable: true })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @ManyToOne(() => AclRole, { nullable: true })
  @JoinColumn({ name: 'roleId' })
  aclRole?: AclRole;

  @Column({ nullable: true })
  roleId?: number;

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
