import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChapitreProgression } from './entities/chapitre-progression.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { User } from '../user/entities/user.entity';
import { AnneeUniversitaireService } from '../annee-universitaire/annee-universitaire.service';
import { extractChapters } from '../matiere/utils/tiptap-chapters.util';
import { ToggleChapitreProgressionDto } from './dto/toggle-chapitre-progression.dto';

@Injectable()
export class ProgressionService {
  constructor(
    @InjectRepository(ChapitreProgression)
    private readonly progressionRepository: Repository<ChapitreProgression>,
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly anneeUniversitaireService: AnneeUniversitaireService,
  ) {}

  private resolveDisplayName(user: User): string {
    if (user.enseignant) {
      return `${user.enseignant.firstName} ${user.enseignant.lastName}`;
    }
    if (user.etudiant) {
      return `${user.etudiant.firstName} ${user.etudiant.lastName}`;
    }
    if (user.parent) {
      return `${user.parent.firstName} ${user.parent.lastName}`;
    }
    return user.username || user.email || `Utilisateur #${user.id}`;
  }

  private async loadUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { enseignant: true, etudiant: true, parent: true },
    });
    if (!user) throw new NotFoundException(`Utilisateur #${userId} introuvable`);
    return user;
  }

  private async loadMatiereWithNiveau(
    matiereId: number,
    niveauId: number,
    tenantId?: number,
  ): Promise<Matiere> {
    const where: any = { id: matiereId };
    if (tenantId) where.etablissementId = tenantId;

    const matiere = await this.matiereRepository.findOne({
      where,
      relations: { niveaux: true },
    });
    if (!matiere) throw new NotFoundException(`Matière #${matiereId} introuvable`);
    if (!matiere.niveaux?.some((n) => n.id === niveauId)) {
      throw new BadRequestException(
        `Le niveau #${niveauId} n'est pas rattaché à cette matière`,
      );
    }
    return matiere;
  }

  async getProgression(matiereId: number, niveauId: number, tenantId?: number) {
    const matiere = await this.loadMatiereWithNiveau(matiereId, niveauId, tenantId);
    const anneeActive = await this.anneeUniversitaireService.getActiveYear(tenantId);

    const chapitres = extractChapters(matiere.elementsConstitutifs);
    const hasLegacyContent =
      chapitres.length === 0 && !!matiere.elementsConstitutifsLegacyHtml;

    const existing = await this.progressionRepository.find({
      where: { matiereId, niveauId, anneeUniversitaireId: anneeActive.id },
    });
    const byChapitreId = new Map(existing.map((p) => [p.chapitreId, p]));

    const items = chapitres.map((c) => {
      const progress = byChapitreId.get(c.id);
      return {
        ...c,
        completed: progress?.completed ?? false,
        completedByName: progress?.completedByName ?? undefined,
        completedAt: progress?.completedAt ?? undefined,
      };
    });

    return {
      matiereId,
      niveauId,
      anneeUniversitaireId: anneeActive.id,
      hasLegacyContent,
      chapitres: items,
      summary: {
        total: items.length,
        completed: items.filter((c) => c.completed).length,
      },
    };
  }

  async toggle(
    matiereId: number,
    chapitreId: string,
    dto: ToggleChapitreProgressionDto,
    user: any,
    tenantId?: number,
  ): Promise<ChapitreProgression> {
    const matiere = await this.loadMatiereWithNiveau(
      matiereId,
      dto.niveauId,
      tenantId,
    );
    const chapitres = extractChapters(matiere.elementsConstitutifs);
    if (!chapitres.some((c) => c.id === chapitreId)) {
      throw new NotFoundException(
        'Chapitre introuvable — le contenu de la matière a peut-être changé',
      );
    }

    const anneeActive = await this.anneeUniversitaireService.getActiveYear(tenantId);

    let progression = await this.progressionRepository.findOne({
      where: {
        matiereId,
        niveauId: dto.niveauId,
        anneeUniversitaireId: anneeActive.id,
        chapitreId,
      },
    });

    if (!progression) {
      progression = this.progressionRepository.create({
        matiereId,
        niveauId: dto.niveauId,
        anneeUniversitaireId: anneeActive.id,
        chapitreId,
        etablissementId: tenantId ?? matiere.etablissementId,
      });
    }

    if (dto.completed) {
      const actor = await this.loadUser(user.id);
      progression.completed = true;
      progression.completedById = actor.id;
      progression.completedByName = this.resolveDisplayName(actor);
      progression.completedByRole = actor.role;
      progression.completedAt = new Date();
    } else {
      progression.completed = false;
      progression.completedById = null;
      progression.completedByName = null;
      progression.completedByRole = null;
      progression.completedAt = null;
    }

    return await this.progressionRepository.save(progression);
  }
}
