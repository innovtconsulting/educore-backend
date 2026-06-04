import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Classe } from "../../classe/entities/classe.entity";
import { Niveau } from "../../niveau/entities/niveau.entity";

@Entity()
export class Matiere {
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Column({ nullable: false, unique: true })
    code!: string;

    @Column({ nullable: false })
    name!: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
    coefficient!: number;

    @ManyToMany(() => Classe, (classe) => classe.matieres)
    @JoinTable()
    classes!: Classe[];

    @ManyToMany(() => Niveau, (niveau) => niveau.matieres)
    @JoinTable()
    niveaux!: Niveau[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
