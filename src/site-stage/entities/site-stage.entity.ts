import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class SiteStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  nom!: string;

  @Column({ nullable: true })
  adresse!: string;

  @Column({ nullable: true })
  ville!: string;

  @Column({ nullable: true })
  telephone!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  responsable!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ nullable: true })
  capacite!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
