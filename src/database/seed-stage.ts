import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../data-source';
import { SiteStageService } from '../site-stage/site-stage.service';
import { SiteStage } from '../site-stage/entities/site-stage.entity';
import { LigneStage } from '../site-stage/entities/ligne-stage.entity';
import { LigneStageSlot } from '../site-stage/entities/ligne-stage-slot.entity';
import { NatureStage } from '../site-stage/entities/nature-stage.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';

dotenv.config();

/**
 * Import ponctuel de la répartition des stages 2025-2026 (fichier fourni par
 * l'établissement) vers le nouveau modèle "ligne de stage". Les étudiants ne
 * sont PAS assignés automatiquement (etudiantId reste null) : l'affectation
 * se fait ensuite manuellement depuis la plateforme. Le nom présent dans le
 * fichier source est conservé comme simple indication (LigneStage.nomIndicatif).
 *
 * Mapping confirmé avec l'établissement : le suffixe de feuille (SF/IG/TL)
 * désigne le parcours "réel" (celui qui contient les étudiants effectivement
 * inscrits), pas les classes de démonstration à codes courts.
 */
const CLASSE_NAME_BY_SUFFIX: Record<string, string> = {
  SF: 'Maieutique',
  IG: 'Sciences infirmières',
  TL: 'Technicien de laboratoire',
};

const ETABLISSEMENT_ID = 1;
const ANNEE_UNIVERSITAIRE_ID = 1;
const MAX_SCAN_ROWS = 2000;

async function seedStage() {
  // La synchronisation par défaut de la datasource (activée hors production)
  // crée les nouvelles tables ligne_stage / ligne_stage_slot si besoin.
  await AppDataSource.initialize();
  console.log('Connexion établie pour le seeding des lignes de stage...');

  // Les anciennes tables (ancien modèle période/affectation) ne sont plus
  // référencées par aucune entité : synchronize ne les supprime pas tout
  // seul, on les retire donc explicitement.
  await AppDataSource.query('DROP TABLE IF EXISTS affectation_stage CASCADE');
  await AppDataSource.query('DROP TABLE IF EXISTS periode_stage CASCADE');

  const siteStageRepo = AppDataSource.getRepository(SiteStage);
  const ligneStageRepo = AppDataSource.getRepository(LigneStage);
  const slotRepo = AppDataSource.getRepository(LigneStageSlot);
  const natureStageRepo = AppDataSource.getRepository(NatureStage);
  const etudiantRepo = AppDataSource.getRepository(Etudiant);
  const enseignantRepo = AppDataSource.getRepository(Enseignant);
  const anneeRepo = AppDataSource.getRepository(AnneeUniversitaire);
  const classeRepo = AppDataSource.getRepository(Classe);
  const niveauRepo = AppDataSource.getRepository(Niveau);
  const etablissementRepo = AppDataSource.getRepository(Etablissement);

  const annee = await anneeRepo.findOne({ where: { id: ANNEE_UNIVERSITAIRE_ID } });
  if (!annee) {
    throw new Error(`Année universitaire #${ANNEE_UNIVERSITAIRE_ID} introuvable`);
  }

  // FinanceService n'est utilisé que par getMyStageInfo (non appelé ici).
  const service = new SiteStageService(
    siteStageRepo,
    ligneStageRepo,
    slotRepo,
    natureStageRepo,
    etudiantRepo,
    enseignantRepo,
    anneeRepo,
    classeRepo,
    niveauRepo,
    etablissementRepo,
    {} as any,
    AppDataSource,
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'data', 'STAGE.xlsx'));

  let totalLignes = 0;
  const skipped: string[] = [];

  for (const worksheet of workbook.worksheets) {
    const match = worksheet.name.trim().match(/^([LMD]\d+)_(.+)$/i);
    if (!match) {
      skipped.push(`${worksheet.name} (nom de feuille non reconnu)`);
      continue;
    }
    const niveauCode = match[1].toUpperCase();
    const suffix = match[2].toUpperCase();
    const classeName = CLASSE_NAME_BY_SUFFIX[suffix];
    if (!classeName) {
      skipped.push(`${worksheet.name} (parcours "${suffix}" non mappé)`);
      continue;
    }

    const classe = await classeRepo.findOne({
      where: { name: classeName, etablissement: { id: ETABLISSEMENT_ID } },
    });
    if (!classe) {
      skipped.push(`${worksheet.name} (classe "${classeName}" introuvable)`);
      continue;
    }
    const niveau = await niveauRepo.findOne({
      where: { name: niveauCode, classe: { id: classe.id } },
    });
    if (!niveau) {
      skipped.push(`${worksheet.name} (niveau "${niveauCode}" introuvable pour "${classeName}")`);
      continue;
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => headers.push(String(cell.value ?? '')));

    // worksheet.rowCount peut être gravement gonflé par des cellules de mise
    // en forme résiduelles (observé jusqu'à 1 048 576) ; on plafonne le scan.
    const cappedRowCount = Math.min(worksheet.rowCount, MAX_SCAN_ROWS);
    const worksheetView = {
      name: worksheet.name,
      rowCount: cappedRowCount,
      getRow: (r: number) => worksheet.getRow(r),
    };

    const result = await service.importLignesFromSheet(
      worksheetView,
      headers,
      worksheet.name,
      ANNEE_UNIVERSITAIRE_ID,
      classe.id,
      niveau.id,
      ETABLISSEMENT_ID,
    );
    totalLignes += result.lignesCreated;
    console.log(`${worksheet.name} -> ${result.lignesCreated} ligne(s) créée(s), ${result.erreurs.length} erreur(s)`);
    result.erreurs.forEach((e) => console.log(`   - ${e}`));
  }

  if (skipped.length > 0) {
    console.log('\nFeuilles ignorées :');
    skipped.forEach((s) => console.log(`   - ${s}`));
  }

  console.log(`\nTotal : ${totalLignes} ligne(s) de stage créée(s) (aucun étudiant assigné, à faire manuellement).`);

  await AppDataSource.destroy();
}

seedStage().catch((e) => {
  console.error('Erreur lors du seeding des lignes de stage :', e);
  process.exit(1);
});
