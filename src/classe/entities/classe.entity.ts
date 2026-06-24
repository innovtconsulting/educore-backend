import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
export class Classe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @ManyToOne(() => Etablissement, (etablissement) => etablissement.classes, { nullable: false })
  etablissement!: Etablissement;

  @OneToMany(() => Niveau, (niveau) => niveau.classe)
  niveaux!: Niveau[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
