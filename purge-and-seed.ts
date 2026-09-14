import { AppDataSource } from './src/data-source';
import { LigneStage } from './src/site-stage/entities/ligne-stage.entity';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { SiteStage } from './src/site-stage/entities/site-stage.entity';
import { LigneStageSlot } from './src/site-stage/entities/ligne-stage-slot.entity';
import { NatureStage } from './src/site-stage/entities/nature-stage.entity';
import { Etudiant } from './src/etudiant/entities/etudiant.entity';
import { Enseignant } from './src/enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from './src/annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from './src/classe/entities/classe.entity';
import { Niveau } from './src/niveau/entities/niveau.entity';
import { Etablissement } from './src/etablissement/entities/etablissement.entity';
import { SiteStageService } from './src/site-stage/site-stage.service';

const CLASSE_NAME_BY_SUFFIX: Record<string, string> = {
  SF: 'Maieutique',
  IG: 'Sciences infirmières',
  TL: 'Technicien de laboratoire',
};
const ETABLISSEMENT_ID = 1;
const ANNEE_UNIVERSITAIRE_ID = 1;
const MAX_SCAN_ROWS = 2000;

async function main(){
  await AppDataSource.initialize();
  console.log('Purge fallback lignes...');
  // Delete all ligne_stage where slots have no siteStage (fallback) OR all lignes (since indicatif is null for all)
  // Safer: delete all ligne_stage (they are all fallbacks) to get clean state
  const countBefore = await AppDataSource.getRepository(LigneStage).count();
  console.log('Before', countBefore);
  // Use TRUNCATE CASCADE for slots
  await AppDataSource.query('TRUNCATE TABLE ligne_stage CASCADE');
  // ligne_stage_slot truncated via cascade, but also truncate explicitly
  await AppDataSource.query('TRUNCATE TABLE ligne_stage_slot CASCADE');
  console.log('Purged, count after', await AppDataSource.getRepository(LigneStage).count());

  // Now seed from XLSX
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
  if (!annee) throw new Error('Annee introuvable');

  const service = new SiteStageService(
    siteStageRepo, ligneStageRepo, slotRepo, natureStageRepo, etudiantRepo, enseignantRepo, anneeRepo, classeRepo, niveauRepo, etablissementRepo, {} as any, AppDataSource
  );

  const workbook = new ExcelJS.Workbook();
  const xlsxPath = path.join(__dirname, 'src', 'database', 'data', 'STAGE.xlsx');
  console.log('Reading', xlsxPath);
  await workbook.xlsx.readFile(xlsxPath);

  let totalLignes = 0;
  const skipped: string[] = [];
  for (const worksheet of workbook.worksheets) {
    const match = worksheet.name.trim().match(/^([LMD]\d+)_(.+)$/i);
    if (!match){ skipped.push(`${worksheet.name} (nom feuille non reconnu)`); continue; }
    const niveauCode = match[1].toUpperCase();
    const suffix = match[2].toUpperCase();
    const classeName = CLASSE_NAME_BY_SUFFIX[suffix];
    if (!classeName){ skipped.push(`${worksheet.name} (parcours ${suffix} non mappé)`); continue; }
    const classe = await classeRepo.findOne({ where: { name: classeName, etablissement: { id: ETABLISSEMENT_ID } } });
    if (!classe){ skipped.push(`${worksheet.name} (classe ${classeName} introuvable)`); continue; }
    const niveau = await niveauRepo.findOne({ where: { name: niveauCode, classe: { id: classe.id } } });
    if (!niveau){ skipped.push(`${worksheet.name} (niveau ${niveauCode} introuvable pour ${classeName})`); continue; }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => headers.push(String(cell.value ?? '')));
    const cappedRowCount = Math.min(worksheet.rowCount, MAX_SCAN_ROWS);
    const worksheetView = { name: worksheet.name, rowCount: cappedRowCount, getRow: (r:number)=> worksheet.getRow(r) };
    const result = await service.importLignesFromSheet(worksheetView, headers, worksheet.name, ANNEE_UNIVERSITAIRE_ID, classe.id, niveau.id, ETABLISSEMENT_ID);
    totalLignes += result.lignesCreated;
    console.log(`${worksheet.name} -> ${result.lignesCreated} ligne(s), ${result.erreurs.length} erreur(s)`);
    result.erreurs.forEach((e)=> console.log('  - '+e));
  }
  if (skipped.length>0){ console.log('Feuilles ignorées:'); skipped.forEach(s=> console.log('  - '+s)); }
  console.log(`Total: ${totalLignes} lignes créées (vacantes)`);
  console.log('Final counts: lignes', await ligneStageRepo.count(), 'slots', await slotRepo.count(), 'vacant', await ligneStageRepo.count({ where: { etudiantId: require('typeorm').IsNull() } as any } as any));
  await AppDataSource.destroy();
}
main().catch(e=>{ console.error(e); process.exit(1); });
