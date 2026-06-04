import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Classe } from "../../classe/entities/classe.entity";
import { Matiere } from "../../matiere/entities/matiere.entity";

@Entity()
export class Niveau {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: false })
    name!: string;

    @ManyToMany(() => Classe, (classe) => classe.niveaux)
    classes!: Classe[];

    @ManyToMany(() => Matiere, (matiere) => matiere.niveaux)
    matieres!: Matiere[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
