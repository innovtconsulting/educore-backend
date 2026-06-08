import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Affectation } from './affectation.entity';

@Entity()
export class Enseignant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  matricule: string;

  @Column({ type: 'date' })
  dateEmbauche: Date;

  @OneToMany(() => Affectation, (affectation) => affectation.enseignant)
  affectations: Affectation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
