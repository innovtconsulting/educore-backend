import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnnonceDto } from './dto/create-annonce.dto';
import { UpdateAnnonceDto } from './dto/update-annonce.dto';
import { Annonce, TargetAudience } from './entities/annonce.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { User, UserRole } from '../user/entities/user.entity';
import { NotificationTokenService } from '../notification-token/notification-token.service';
import { NotificationService } from '../shared/services/notification.service';

@Injectable()
export class AnnonceService {
  constructor(
    @InjectRepository(Annonce)
    private readonly annonceRepository: Repository<Annonce>,
    private readonly notificationTokenService: NotificationTokenService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    createAnnonceDto: CreateAnnonceDto,
    user: User,
    tenantId?: number,
  ) {
    const resolvedTenantId = tenantId ?? user.etablissementId;

    const annonce = this.annonceRepository.create({
      ...createAnnonceDto,
      createdBy: { id: user.id },
      etablissement: resolvedTenantId ? { id: resolvedTenantId } : undefined,
    });

    const savedAnnonce = await this.annonceRepository.save(annonce);

    // Send notifications
    let targetRoles: string[] = [];

    if (savedAnnonce.targetAudiences.includes(TargetAudience.TOUS)) {
      targetRoles = [
        UserRole.ETUDIANT,
        UserRole.PARENT,
        UserRole.ENSEIGNANT,
        UserRole.ADMIN,
        UserRole.COMPTABLE,
        UserRole.MONITRICE,
        UserRole.SUPER_ADMIN,
      ];
    } else {
      if (savedAnnonce.targetAudiences.includes(TargetAudience.ENSEIGNANTS)) {
        targetRoles.push(UserRole.ENSEIGNANT);
      }
      if (savedAnnonce.targetAudiences.includes(TargetAudience.ETUDIANTS)) {
        targetRoles.push(UserRole.ETUDIANT);
      }
      if (savedAnnonce.targetAudiences.includes(TargetAudience.PARENTS)) {
        targetRoles.push(UserRole.PARENT);
      }
      if (savedAnnonce.targetAudiences.includes(TargetAudience.COMPTABLES)) {
        targetRoles.push(UserRole.COMPTABLE);
      }
    }

    const tokens =
      await this.notificationTokenService.findTokensForRoleAndTenant(
        targetRoles,
        tenantId,
      );

    const tokenStrings = tokens.map((t) => t.token);

    const invalidTokens =
      await this.notificationService.sendBulkPushNotifications(
        tokenStrings,
        `📢 ${savedAnnonce.title}`,
        savedAnnonce.content,
        { annonceId: savedAnnonce.id },
      );

    if (invalidTokens.length > 0) {
      await this.notificationTokenService.removeByTokens(invalidTokens);
    }

    return savedAnnonce;
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    user: User,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15, search } = paginationQuery;
    const skip = (page - 1) * limit;

    // Determine which audiences this user should see
    const userAudiences: TargetAudience[] = [TargetAudience.TOUS];
    if (user.role === UserRole.ENSEIGNANT) {
      userAudiences.push(TargetAudience.ENSEIGNANTS);
    } else if (user.role === UserRole.ETUDIANT) {
      userAudiences.push(TargetAudience.ETUDIANTS);
    } else if (user.role === UserRole.PARENT) {
      userAudiences.push(TargetAudience.PARENTS);
    } else if (user.role === UserRole.COMPTABLE) {
      userAudiences.push(TargetAudience.COMPTABLES);
    } else {
      // Admin, SuperAdmin, Monitrice see all
      userAudiences.push(...Object.values(TargetAudience));
    }

    // Build the where condition
    const queryBuilder = this.annonceRepository
      .createQueryBuilder('annonce')
      .leftJoinAndSelect('annonce.createdBy', 'createdBy');

    if (tenantId) {
      queryBuilder.where(
        '(annonce.etablissementId = :tenantId OR annonce.etablissementId IS NULL)',
        { tenantId },
      );
    }

    // Add audience filter using LIKE for simple-array
    queryBuilder.andWhere(
      '(annonce.targetAudiences LIKE :tous OR ' +
        'annonce.targetAudiences LIKE :enseignant OR ' +
        'annonce.targetAudiences LIKE :etudiant OR ' +
        'annonce.targetAudiences LIKE :parent OR ' +
        'annonce.targetAudiences LIKE :comptable)',
      {
        tous: `%${TargetAudience.TOUS}%`,
        enseignant: `%${TargetAudience.ENSEIGNANTS}%`,
        etudiant: `%${TargetAudience.ETUDIANTS}%`,
        parent: `%${TargetAudience.PARENTS}%`,
        comptable: `%${TargetAudience.COMPTABLES}%`,
      },
    );

    // Add search filter if needed
    if (search) {
      queryBuilder.andWhere(
        '(annonce.title ILIKE :search OR annonce.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('annonce.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, user: User, tenantId?: number) {
    const resolvedTenantId = tenantId ?? user.etablissementId;
    const where = TenantHelper.addTenantFilter({ id }, resolvedTenantId);
    const annonce = await this.annonceRepository.findOne({
      where,
      relations: { createdBy: true },
    });

    if (!annonce) {
      throw new NotFoundException(`Annonce #${id} non trouvée`);
    }

    // Check if user is authorized to see this annonce
    const isAuthorized =
      annonce.targetAudiences.includes(TargetAudience.TOUS) ||
      (user.role === UserRole.ENSEIGNANT &&
        annonce.targetAudiences.includes(TargetAudience.ENSEIGNANTS)) ||
      (user.role === UserRole.ETUDIANT &&
        annonce.targetAudiences.includes(TargetAudience.ETUDIANTS)) ||
      (user.role === UserRole.PARENT &&
        annonce.targetAudiences.includes(TargetAudience.PARENTS)) ||
      (user.role === UserRole.COMPTABLE &&
        annonce.targetAudiences.includes(TargetAudience.COMPTABLES)) ||
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MONITRICE].includes(
        user.role,
      );

    if (!isAuthorized) {
      throw new NotFoundException(`Annonce #${id} non trouvée`);
    }

    return annonce;
  }

  async update(
    id: number,
    updateAnnonceDto: UpdateAnnonceDto,
    user: User,
    tenantId?: number,
  ) {
    const resolvedTenantId = tenantId ?? user.etablissementId;
    const where = TenantHelper.addTenantFilter({ id }, resolvedTenantId);
    const annonce = await this.annonceRepository.findOne({ where });

    if (!annonce) {
      throw new NotFoundException(`Annonce #${id} non trouvée`);
    }

    Object.assign(annonce, updateAnnonceDto);
    return await this.annonceRepository.save(annonce);
  }

  async remove(id: number, user: User, tenantId?: number) {
    const resolvedTenantId = tenantId ?? user.etablissementId;
    const where = TenantHelper.addTenantFilter({ id }, resolvedTenantId);
    const annonce = await this.annonceRepository.findOne({ where });

    if (!annonce) {
      throw new NotFoundException(`Annonce #${id} non trouvée`);
    }

    return await this.annonceRepository.remove(annonce);
  }
}
