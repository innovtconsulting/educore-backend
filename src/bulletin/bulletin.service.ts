import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../note/entities/note.entity';
import { Evaluation, EvaluationSession, EvaluationType } from '../evaluation/entities/evaluation.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Semestre } from '../semestre/entities/semestre.entity';
import { generateBulletinPdf } from './utils/bulletin-pdf-generator';

@Injectable()
export class BulletinService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Semestre)
    private readonly semestreRepository: Repository<Semestre>,
  ) {}

  async getStudentBulletin(etudiantId: number, semestreId: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { classe: true, niveau: true, etablissement: true },
    });
    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

    const semestre = await this.semestreRepository.findOne({ where: { id: semestreId } });
    if (!semestre) throw new NotFoundException('Semestre non trouvé');

    // Récupérer toutes les notes de l'étudiant pour ce semestre
    const notes = await this.noteRepository.find({
      where: {
        etudiant: { id: etudiantId },
        evaluation: { semestre: { id: semestreId } },
      },
      relations: {
        evaluation: { matiere: true },
      },
    });

    // Organiser les notes par matière
    const matiereData = new Map<number, any>();

    notes.forEach((note) => {
      const matId = note.evaluation.matiere.id;
      if (!matiereData.has(matId)) {
        matiereData.set(matId, {
          matiere: note.evaluation.matiere,
          notes: [],
        });
      }
      matiereData.get(matId).notes.push(note);
    });

    const results: any[] = [];
    let totalWeightedAverage = 0;
    let totalCoefficients = 0;

    for (const [matId, data] of matiereData) {
      const mat = data.matiere;
      const matNotes = data.notes;

      // Calculer la moyenne de la matière
      // On sépare Session Normale et Rattrapage
      const normaleNotes = matNotes.filter(n => n.evaluation.session === EvaluationSession.NORMALE);
      const rattrapageNotes = matNotes.filter(n => n.evaluation.session === EvaluationSession.RATTRAPAGE);

      let matAverage = this.calculateWeightedAverage(normaleNotes);

      // Gestion du rattrapage LMD: Si moyenne < 10 et qu'il y a des notes de rattrapage
      if (matAverage < 10 && rattrapageNotes.length > 0) {
        // Dans une implémentation simple, le rattrapage remplace la note d'examen la plus basse ou recalcule la moyenne
        // Ici on va dire que le rattrapage remplace la moyenne si elle est meilleure
        const rattrapageAverage = this.calculateWeightedAverage([...normaleNotes.filter(n => n.evaluation.type === EvaluationType.CC), ...rattrapageNotes]);
        if (rattrapageAverage > matAverage) {
          matAverage = rattrapageAverage;
        }
      }

      results.push({
        matiereId: mat.id,
        code: mat.code,
        nom: mat.name,
        coefficient: mat.coefficient,
        moyenne: parseFloat(matAverage.toFixed(2)),
        isEliminatoire: matAverage <= 4, // Règle LMD mentionnée par l'utilisateur
        notes: matNotes.map(n => ({
          type: n.evaluation.type,
          session: n.evaluation.session,
          valeur: n.value,
          coefficient: n.evaluation.weight,
        })),
      });

      totalWeightedAverage += matAverage * mat.coefficient;
      totalCoefficients += parseFloat(mat.coefficient.toString());
    }

    const moyenneGenerale = totalCoefficients > 0 ? totalWeightedAverage / totalCoefficients : 0;

    return {
      etudiant: {
        id: etudiant.id,
        nom: `${etudiant.lastName} ${etudiant.firstName}`,
        matricule: etudiant.matricule,
        classe: etudiant.classe.name,
        niveau: etudiant.niveau.name,
        etablissement: etudiant.etablissement,
      },
      semestre: semestre.name,
      moyenneGenerale: parseFloat(moyenneGenerale.toFixed(2)),
      decisions: {
        isAdmis: moyenneGenerale >= 10,
        hasEliminatoire: results.some(r => r.isEliminatoire),
      },
      details: results,
    };
  }

  async getStudentBulletinPdf(etudiantId: number, semestreId: number) {
    const data = await this.getStudentBulletin(etudiantId, semestreId);
    return await generateBulletinPdf(data);
  }

  private calculateWeightedAverage(notes: Note[]): number {
    if (notes.length === 0) return 0;
    let sum = 0;
    let weightSum = 0;
    notes.forEach(n => {
      sum += n.value * n.evaluation.weight;
      weightSum += parseFloat(n.evaluation.weight.toString());
    });
    return weightSum > 0 ? sum / weightSum : 0;
  }
}
