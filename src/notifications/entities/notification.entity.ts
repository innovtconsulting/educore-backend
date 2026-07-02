import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Facture } from '../../finance/entities/facture.entity';

export enum NotificationType {
  ECOLAGE_RETARD = 'ECOLAGE_RETARD',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  title!: string;

  @Column({ type: 'text' })
  @ApiProperty()
  message!: string;

  @Column({
    type: 'varchar',
    default: NotificationType.ECOLAGE_RETARD,
  })
  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @Column({ default: false })
  @ApiProperty()
  isRead!: boolean;

  @Column({ unique: true })
  dedupeKey!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => User })
  recipient!: User;

  @ManyToOne(() => Facture, { nullable: true, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Facture, required: false })
  facture?: Facture;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
