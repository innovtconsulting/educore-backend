import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum DeviceType {
  ANDROID = 'Android',
  IOS = 'iOS',
  WEB = 'Web',
}

@Entity()
export class NotificationToken {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'text' })
  @ApiProperty()
  token!: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.ANDROID,
  })
  @ApiProperty({ enum: DeviceType })
  deviceType!: DeviceType;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: false })
  userId!: number;

  @ManyToOne(() => Etablissement, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etablissementId' })
  etablissement?: Etablissement;

  @Column({ nullable: true })
  etablissementId?: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
