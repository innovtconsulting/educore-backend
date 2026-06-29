import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Document } from '../../document/entities/document.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Devoir {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  title!: string;

  @Column({ type: 'text' })
  @ApiProperty()
  description!: string;

  @Column({ type: 'timestamp' })
  @ApiProperty()
  deadline!: Date;

  @ManyToOne(() => Matiere, { nullable: false })
  @ApiProperty({ type: () => Matiere })
  matiere!: Matiere;

  @ManyToOne(() => Classe, { nullable: false })
  @ApiProperty({ type: () => Classe })
  classe!: Classe;

  @ManyToOne(() => Niveau, { nullable: false })
  @ApiProperty({ type: () => Niveau })
  niveau!: Niveau;

  @ManyToOne(() => Enseignant, { nullable: false })
  @ApiProperty({ type: () => Enseignant })
  enseignant!: Enseignant;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @ManyToMany(() => Document)
  @JoinTable()
  @ApiProperty({ type: () => [Document], isArray: true })
  documents!: Document[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
