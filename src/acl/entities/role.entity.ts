import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from './permission.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty({ example: 'Admin' })
  name!: string;

  @Column({ nullable: true })
  @ApiProperty({ example: 'Administrateur de l\'établissement' })
  description?: string;

  @ManyToMany(() => Permission)
  @JoinTable({ name: 'role_permissions' })
  @ApiProperty({ type: () => [Permission] })
  permissions!: Permission[];
}
