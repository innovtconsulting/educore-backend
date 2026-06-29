import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CreateGlobalSettingDto } from './dto/create-global-setting.dto';
import { UpdateGlobalSettingDto } from './dto/update-global-setting.dto';
import {
  GlobalSetting,
  SettingCategory,
} from './entities/global-setting.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class GlobalSettingService implements OnModuleInit {
  constructor(
    @InjectRepository(GlobalSetting)
    private readonly repo: Repository<GlobalSetting>,
  ) {}

  // Initialisation des paramètres par défaut au démarrage du module
  async onModuleInit() {
    const defaultSettings: CreateGlobalSettingDto[] = [
      // ACADEMIC
      {
        key: 'ACADEMIC_PASSING_GRADE',
        value: '10',
        category: SettingCategory.ACADEMIC,
        description: 'Moyenne de passage par défaut',
      },
      {
        key: 'ACADEMIC_ELIMINATION_THRESHOLD',
        value: '4',
        category: SettingCategory.ACADEMIC,
        description: 'Note éliminatoire',
      },
      {
        key: 'ACADEMIC_ATTENDANCE_REQUIRED_PCT',
        value: '80',
        category: SettingCategory.ACADEMIC,
        description: 'Pourcentage de présence requis',
      },

      // SECURITY & REGISTRATION
      {
        key: 'ENABLE_STUDENT_REGISTRATION',
        value: 'true',
        category: SettingCategory.SECURITY,
        description: "Autoriser l'auto-inscription des étudiants",
      },
      {
        key: 'ENABLE_TEACHER_REGISTRATION',
        value: 'true',
        category: SettingCategory.SECURITY,
        description: "Autoriser l'auto-inscription des enseignants",
      },
      {
        key: 'MAINTENANCE_MODE',
        value: 'false',
        category: SettingCategory.SECURITY,
        description: 'Activer le mode maintenance',
      },

      // FINANCIAL
      {
        key: 'FINANCIAL_CURRENCY',
        value: 'CFA',
        category: SettingCategory.FINANCIAL,
        description: 'Devise du système',
      },
      {
        key: 'FINANCIAL_LATE_FEE_PCT',
        value: '0',
        category: SettingCategory.FINANCIAL,
        description: 'Pourcentage de pénalité de retard',
      },

      // SYSTEM
      {
        key: 'SYSTEM_MAX_UPLOAD_SIZE_MB',
        value: '10',
        category: SettingCategory.SYSTEM,
        description: 'Taille max des uploads en Mo',
      },
      {
        key: 'SYSTEM_EMAIL_SENDER_NAME',
        value: 'Administration Scolaire',
        category: SettingCategory.SYSTEM,
        description: "Nom de l'expéditeur des emails",
      },
    ];
  }

  async create(dto: CreateGlobalSettingDto, tenantId?: number) {
    // Check if setting already exists for this tenant
    const where: FindOptionsWhere<GlobalSetting> = { key: dto.key };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    const exists = await this.repo.findOne({ where });
    if (exists) {
      throw new NotFoundException(`Paramètre '${dto.key}' existe déjà`);
    }

    const setting = this.repo.create({
      ...dto,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });
    return await this.repo.save(setting);
  }

  async findAll(tenantId?: number) {
    const where: FindOptionsWhere<GlobalSetting> = {};
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    return await this.repo.find({
      where,
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  async findOne(key: string, tenantId?: number) {
    const where: FindOptionsWhere<GlobalSetting> = { key };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }

    // First try to find tenant-specific setting
    let setting = await this.repo.findOne({ where });
    if (!setting) {
      // If not found, try to find a global setting (without etablissement)
      setting = await this.repo.findOne({ where: { key } });
    }

    if (!setting) {
      throw new NotFoundException(`Paramètre '${key}' introuvable`);
    }
    return setting;
  }

  async getValue(
    key: string,
    defaultValue?: string,
    tenantId?: number,
  ): Promise<string | undefined> {
    try {
      const setting = await this.findOne(key, tenantId);
      return setting ? setting.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async update(key: string, dto: UpdateGlobalSettingDto, tenantId?: number) {
    // Try to find existing setting for this tenant
    const where: FindOptionsWhere<GlobalSetting> = { key };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }

    let setting = await this.repo.findOne({ where });
    if (!setting) {
      // If not found, try to create a new one for this tenant
      setting = this.repo.create({
        key,
        ...dto,
        etablissement: tenantId ? { id: tenantId } : undefined,
      });
    } else {
      Object.assign(setting, dto);
    }

    return await this.repo.save(setting);
  }

  async remove(key: string, tenantId?: number) {
    const where: FindOptionsWhere<GlobalSetting> = { key };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }

    const setting = await this.repo.findOne({ where });
    if (!setting) {
      throw new NotFoundException(`Paramètre '${key}' introuvable`);
    }

    return await this.repo.remove(setting);
  }
}
