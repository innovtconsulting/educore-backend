import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty({ example: 'STUDENT_CREATE' })
  name!: string;

  @Column({ nullable: true })
  @ApiProperty({ example: 'Permet de créer un étudiant' })
  description?: string;
}
