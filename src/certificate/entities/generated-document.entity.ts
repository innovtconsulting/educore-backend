import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { User } from '../../user/entities/user.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum AdministrativeDocumentType {
  SCOLARITY_CERTIFICATE = 'Certificat de Scolarité',
  SUCCESS_ATTESTATION = 'Attestation de Réussite',
}

@Entity()
export class GeneratedDocument {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({
    type: 'varchar',
  })
  @ApiProperty({ enum: AdministrativeDocumentType })
  type!: AdministrativeDocumentType;

  // Génération désormais entièrement côté navigateur (jsPDF) : aucun fichier
  // n'est plus stocké côté serveur, donc plus nécessairement de chemin.
  @Column({ nullable: true })
  @ApiProperty({ required: false })
  filePath?: string;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etudiantId' })
  etudiant!: Etudiant;

  @Column()
  etudiantId!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'generatedById' })
  generatedBy?: User;

  @Column({ nullable: true })
  generatedById?: number;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column()
  etablissementId!: number;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ required: false })
  metadata?: any;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;
}
