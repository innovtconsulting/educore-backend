import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGlobalSettingDto } from './dto/create-global-setting.dto';
import { UpdateGlobalSettingDto } from './dto/update-global-setting.dto';
import { GlobalSetting, SettingCategory } from './entities/global-setting.entity';

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
      { key: 'ACADEMIC_PASSING_GRADE', value: '10', category: SettingCategory.ACADEMIC, description: 'Moyenne de passage par défaut' },
      { key: 'ACADEMIC_ELIMINATION_THRESHOLD', value: '4', category: SettingCategory.ACADEMIC, description: 'Note éliminatoire' },
      { key: 'ACADEMIC_ATTENDANCE_REQUIRED_PCT', value: '80', category: SettingCategory.ACADEMIC, description: 'Pourcentage de présence requis' },
      
      // SECURITY & REGISTRATION
      { key: 'ENABLE_STUDENT_REGISTRATION', value: 'true', category: SettingCategory.SECURITY, description: 'Autoriser l\'auto-inscription des étudiants' },
      { key: 'ENABLE_TEACHER_REGISTRATION', value: 'true', category: SettingCategory.SECURITY, description: 'Autoriser l\'auto-inscription des enseignants' },
      { key: 'MAINTENANCE_MODE', value: 'false', category: SettingCategory.SECURITY, description: 'Activer le mode maintenance' },
      
      // FINANCIAL
      { key: 'FINANCIAL_CURRENCY', value: 'CFA', category: SettingCategory.FINANCIAL, description: 'Devise du système' },
      { key: 'FINANCIAL_LATE_FEE_PCT', value: '0', category: SettingCategory.FINANCIAL, description: 'Pourcentage de pénalité de retard' },
      
      // SYSTEM
      { key: 'SYSTEM_MAX_UPLOAD_SIZE_MB', value: '10', category: SettingCategory.SYSTEM, description: 'Taille max des uploads en Mo' },
      { key: 'SYSTEM_EMAIL_SENDER_NAME', value: 'Administration Scolaire', category: SettingCategory.SYSTEM, description: 'Nom de l\'expéditeur des emails' },
    ];

    for (const setting of defaultSettings) {
      const exists = await this.repo.findOne({ where: { key: setting.key } });
      if (!exists) {
        await this.repo.save(this.repo.create(setting));
      }
    }
  }

  async create(dto: CreateGlobalSettingDto) {
    const setting = this.repo.create(dto);
    return await this.repo.save(setting);
  }

  async findAll() {
    return await this.repo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async findOne(key: string) {
    const setting = await this.repo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Paramètre '${key}' introuvable`);
    return setting;
  }

  async getValue(key: string, defaultValue?: string): Promise<string | undefined> {
    const setting = await this.repo.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async update(key: string, dto: UpdateGlobalSettingDto) {
    const setting = await this.findOne(key);
    Object.assign(setting, dto);
    return await this.repo.save(setting);
  }

  async remove(key: string) {
    const setting = await this.findOne(key);
    return await this.repo.remove(setting);
  }
}
