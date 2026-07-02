import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateNotificationTokenDto } from './dto/create-notification-token.dto';
import { NotificationToken } from './entities/notification-token.entity';
import { User } from '../user/entities/user.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class NotificationTokenService {
  constructor(
    @InjectRepository(NotificationToken)
    private readonly notificationTokenRepository: Repository<NotificationToken>,
  ) {}

  async create(
    createNotificationTokenDto: CreateNotificationTokenDto,
    user: User,
    tenantId?: number,
  ) {
    // Check if token already exists
    const existingToken = await this.notificationTokenRepository.findOne({
      where: {
        token: createNotificationTokenDto.token,
        userId: user.id,
      },
    });

    if (existingToken) {
      // Update existing token
      Object.assign(existingToken, createNotificationTokenDto);
      return await this.notificationTokenRepository.save(existingToken);
    }

    // Create new token
    const token = this.notificationTokenRepository.create({
      ...createNotificationTokenDto,
      user: { id: user.id },
      etablissement: tenantId ? { id: tenantId } : undefined,
    });

    return await this.notificationTokenRepository.save(token);
  }

  async findAllForUser(userId: number, tenantId?: number) {
    let where: any = { userId };
    where = TenantHelper.addTenantFilter(where, tenantId);
    return await this.notificationTokenRepository.find({ where });
  }

  async findTokensForRoleAndTenant(userRoles: string[], tenantId?: number) {
    if (userRoles.length === 0) {
      return [];
    }

    const queryBuilder = this.notificationTokenRepository
      .createQueryBuilder('notificationToken')
      .leftJoinAndSelect('notificationToken.user', 'user');

    if (tenantId) {
      queryBuilder.andWhere('notificationToken.etablissementId = :tenantId', {
        tenantId,
      });
    }

    queryBuilder.andWhere('user.role IN (:...userRoles)', { userRoles });

    return await queryBuilder.getMany();
  }

  async removeByTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    await this.notificationTokenRepository.delete({ token: In(tokens) });
  }

  async remove(id: number, user: User, tenantId?: number) {
    const where = TenantHelper.addTenantFilter(
      { id, userId: user.id },
      tenantId,
    );
    const token = await this.notificationTokenRepository.findOne({ where });

    if (!token) {
      throw new NotFoundException(`Notification token #${id} not found`);
    }

    return await this.notificationTokenRepository.remove(token);
  }
}
