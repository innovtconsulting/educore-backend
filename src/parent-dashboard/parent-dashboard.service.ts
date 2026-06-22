import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from '../parent/entities/parent.entity';
import { NoteService } from '../note/note.service';
import { PresenceService } from '../presence/presence.service';
import { FinanceService } from '../finance/finance.service';
import { SanctionService } from '../sanction/sanction.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { Role } from '../user/entities/user.entity';

@Injectable()
export class ParentDashboardService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    private readonly noteService: NoteService,
    private readonly presenceService: PresenceService,
    private readonly financeService: FinanceService,
    private readonly sanctionService: SanctionService,
  ) {}

  async getDashboardData(user: any) {
    const parentId = user.parentId;
    if (!parentId) {
      throw new NotFoundException(
        'Identifiant parent non trouvé dans le jeton. Déconnectez-vous et reconnectez-vous.',
      );
    }

    const parent = await this.parentRepository.findOne({
      where: { id: parentId },
      relations: {
        etudiants: {
          classe: true,
          niveau: true,
          etablissement: true,
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Profil parent non trouvé');
    }

    const parentUser = {
      role: Role.PARENT,
      parentId,
    };

    const childrenData = await Promise.all(
      parent.etudiants.map(async (etudiant) => {
        const tenantId = etudiant.etablissement?.id;

        const loadChildData = async () => {
          const [notes, presenceStats, absencesToday, invoices, sanctions] =
            await Promise.all([
              this.noteService.findAll(
                { page: 1, limit: 5 },
                { etudiantId: etudiant.id },
              ),
              this.presenceService.getStudentStats(etudiant.id, parentUser),
              this.presenceService.getStudentAbsencesToday(etudiant.id),
              this.financeService.findByEtudiant(etudiant.id),
              this.sanctionService.findByEtudiant(etudiant.id),
            ]);

          const totalRemaining = invoices.reduce((acc, inv) => {
            const total = Number(inv.montantTotal) || 0;
            const paid = (inv.paiements || []).reduce(
              (sum, p) => sum + (Number(p.montant) || 0),
              0,
            );
            return acc + (total - paid);
          }, 0);

          return {
            id: etudiant.id,
            fullName: `${etudiant.firstName} ${etudiant.lastName}`,
            matricule: etudiant.matricule,
            classe: etudiant.classe.name,
            niveau: etudiant.niveau.name,
            etablissement: etudiant.etablissement?.name ?? '',
            recentNotes: notes.items,
            presence: {
              absentsTotal: presenceStats.absents,
              retardsTotal: presenceStats.retards,
              absencesToday: absencesToday.map((p) => ({
                matiere: p.emploiDuTemp.matiere.name,
                startTime: p.emploiDuTemp.startTime,
                remark: p.remark,
              })),
            },
            finances: {
              totalInvoices: invoices.length,
              unpaidInvoicesCount: invoices.filter((f) => f.status !== 'Payée')
                .length,
              totalRemaining: totalRemaining,
            },
            recentSanctions: sanctions.slice(0, 3),
          };
        };

        if (tenantId) {
          return TenantContext.run(tenantId, loadChildData);
        }

        return loadChildData();
      }),
    );

    return {
      parent: {
        id: parent.id,
        fullName: `${parent.firstName} ${parent.lastName}`,
      },
      children: childrenData,
    };
  }
}
