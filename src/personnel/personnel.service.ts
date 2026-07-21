import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Personnel } from './entities/personnel.entity';
import { PaiePersonnel } from './entities/paie-personnel.entity';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreatePaieDto } from './dto/create-paie.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(Personnel)
    private readonly personnelRepository: Repository<Personnel>,
    @InjectRepository(PaiePersonnel)
    private readonly paieRepository: Repository<PaiePersonnel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreatePersonnelDto, tenantId?: number) {
    if (!tenantId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    // Si un userId est fourni, lier l'utilisateur existant
    if (dto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId, etablissementId: tenantId },
        relations: { enseignant: true },
      });
      if (!user) {
        throw new NotFoundException(`Utilisateur #${dto.userId} introuvable`);
      }

      const existing = await this.personnelRepository.findOneBy({ userId: dto.userId });
      if (existing) {
        throw new BadRequestException('Cet utilisateur est déjà lié à un personnel');
      }

      // Auto-remplir nom/poste depuis l'utilisateur si non fournis
      const nom = dto.nom || this.buildUserDisplayName(user);
      const poste = dto.poste || this.buildUserPoste(user);

      const personnel = this.personnelRepository.create({
        nom,
        poste,
        salaireMensuel: dto.salaireMensuel,
        userId: dto.userId,
        user,
        etablissement: { id: tenantId } as Etablissement,
        etablissementId: tenantId,
      });
      return await this.personnelRepository.save(personnel);
    }

    // Sans userId : création libre (pour non-utilisateurs)
    if (!dto.nom) {
      throw new BadRequestException('Le nom est requis si aucun utilisateur n\'est lié');
    }
    const personnel = this.personnelRepository.create({
      ...dto,
      etablissement: { id: tenantId } as Etablissement,
      etablissementId: tenantId,
    });
    return await this.personnelRepository.save(personnel);
  }

  private buildUserDisplayName(user: User): string {
    if (user.enseignant) {
      return `${user.enseignant.firstName} ${user.enseignant.lastName}`;
    }
    return user.username || user.email || `Utilisateur #${user.id}`;
  }

  private buildUserPoste(user: User): string {
    const posteMap: Record<string, string> = {
      SuperAdmin: 'Super Administrateur',
      Admin: 'Administrateur',
      Comptable: 'Comptable',
      Surveillant: 'Surveillant',
      Enseignant: 'Enseignant',
    };
    return posteMap[user.role] || user.role;
  }

  async findAll(tenantId?: number) {
    const where = TenantHelper.addTenantFilter({}, tenantId);
    return await this.personnelRepository.find({
      where,
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter({ id }, tenantId);
    const personnel = await this.personnelRepository.findOne({
      where,
      relations: { paies: true, user: true },
    });
    if (!personnel) {
      throw new NotFoundException(`Personnel #${id} introuvable`);
    }
    return personnel;
  }

  async update(id: number, dto: UpdatePersonnelDto, tenantId?: number) {
    const personnel = await this.findOne(id, tenantId);
    Object.assign(personnel, dto);
    return await this.personnelRepository.save(personnel);
  }

  async remove(id: number, tenantId?: number) {
    const personnel = await this.findOne(id, tenantId);
    await this.personnelRepository.remove(personnel);
  }

  // --- Paie ---

  async createPaie(personnelId: number, dto: CreatePaieDto, tenantId?: number) {
    const personnel = await this.findOne(personnelId, tenantId);

    // Vérifier qu'il n'y a pas déjà un solde pour ce mois/année
    if (dto.type === 'Solde') {
      const existant = await this.paieRepository.findOne({
        where: {
          personnelId,
          type: 'Solde' as any,
          mois: dto.mois,
          annee: dto.annee,
        },
      });
      if (existant) {
        throw new BadRequestException(
          `Un solde a déjà été enregistré pour ${personnel.nom} pour ${dto.mois}/${dto.annee}`,
        );
      }
    }

    const paie = this.paieRepository.create({
      personnel,
      personnelId,
      type: dto.type as any,
      montant: dto.montant,
      datePaiement: new Date(dto.datePaiement),
      mois: dto.mois,
      annee: dto.annee,
      description: dto.description,
    });
    return await this.paieRepository.save(paie);
  }

  async searchUsers(search: string, tenantId?: number) {
    if (!search || search.length < 2) return [];

    const staffRoles = ['Admin', 'Comptable', 'Surveillant', 'Enseignant', 'SuperAdmin'];
    const term = `%${search}%`;

    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.enseignant', 'enseignant')
      .where('user.etablissementId = :tenantId', { tenantId })
      .andWhere('user.role IN (:...roles)', { roles: staffRoles })
      .andWhere(
        '(LOWER(user.email) LIKE LOWER(:term) OR LOWER(user.username) LIKE LOWER(:term) OR LOWER(enseignant.firstName) LIKE LOWER(:term) OR LOWER(enseignant.lastName) LIKE LOWER(:term) OR LOWER(enseignant.email) LIKE LOWER(:term))',
        { term },
      )
      .take(15)
      .getMany();

    const allPersonnel = await this.personnelRepository.find({
      where: { userId: Not(IsNull()), etablissementId: tenantId },
    });
    const linkedUserIds = allPersonnel.map((p) => p.userId).filter((id): id is number => id != null);

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      firstName: u.enseignant?.firstName || u.username || '',
      lastName: u.enseignant?.lastName || '',
      alreadyLinked: linkedUserIds.includes(u.id),
    }));
  }

  async getPaieSummary(personnelId: number, tenantId?: number) {
    const personnel = await this.findOne(personnelId, tenantId);
    const paies = personnel.paies ?? [];

    // Grouper par mois/année
    const summary: Record<string, { mois: number; annee: number; avance: number; solde: number; total: number }> = {};
    for (const paie of paies) {
      const key = `${paie.annee}-${String(paie.mois).padStart(2, '0')}`;
      if (!summary[key]) {
        summary[key] = { mois: paie.mois, annee: paie.annee, avance: 0, solde: 0, total: 0 };
      }
      if (paie.type === 'Avance') {
        summary[key].avance += Number(paie.montant);
      } else {
        summary[key].solde += Number(paie.montant);
      }
      summary[key].total += Number(paie.montant);
    }

    const totalAvance = paies
      .filter((p) => p.type === 'Avance')
      .reduce((s, p) => s + Number(p.montant), 0);
    const totalSolde = paies
      .filter((p) => p.type === 'Solde')
      .reduce((s, p) => s + Number(p.montant), 0);

    return {
      personnel,
      paies,
      resume: Object.values(summary).sort((a, b) => {
        if (a.annee !== b.annee) return b.annee - a.annee;
        return b.mois - a.mois;
      }),
      totalAvance,
      totalSolde,
      totalPaye: totalAvance + totalSolde,
      salaireMensuel: Number(personnel.salaireMensuel),
    };
  }
}
