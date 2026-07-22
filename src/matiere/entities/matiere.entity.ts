import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Matiere {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  code!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  coefficient!: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  hours!: number;

  @Column({ type: 'varchar', nullable: true })
  numeroUe?: string;

  // Document Tiptap JSON (node "doc") : chaque chapitre/sous-chapitre (listItem
  // dans un orderedList) porte un id stable, utilisé par le module `progression`
  // pour suivre l'avancement du programme sans avoir à parser du HTML.
  @Column({ type: 'jsonb', nullable: true })
  elementsConstitutifs?: Record<string, any> | null;

  // Ancien contenu HTML (avant le passage au format JSON structuré), conservé en
  // lecture seule pour ne rien perdre. Jamais réécrit : une fois la matière
  // rouverte et réenregistrée, `elementsConstitutifs` (JSON) prend le relais.
  @Column({ type: 'text', nullable: true })
  elementsConstitutifsLegacyHtml?: string | null;

  @Column({ type: 'int', nullable: true })
  tpTd?: number;

  @Column({ type: 'int', nullable: true })
  tpe?: number;

  @Column({ type: 'int', nullable: true })
  vht?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  credits?: number;

  @ManyToMany(() => Niveau, (niveau) => niveau.matieres)
  @JoinTable()
  niveaux!: Niveau[];

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
