import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Matiere } from '../../matiere/entities/matiere.entity';

@Entity()
export class Classe {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: false })
    name!: string;

    @ManyToMany(() => Niveau, (niveau) => niveau.classes)
    @JoinTable()
    niveaux!: Niveau[];

    @ManyToMany(() => Etablissement, (etablissement) => etablissement.classes)
    @JoinTable()
    etablissements!: Etablissement[];

    @ManyToMany(() => Matiere, (matiere) => matiere.classes)
    matieres!: Matiere[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
