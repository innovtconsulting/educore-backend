import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export async function generateBulletinPdf(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `bulletin_${data.etudiant.matricule}_${data.semestre.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'documents');

      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- En-tête ---
      const schoolName =
        data.etudiant.etablissement?.name?.toUpperCase() ||
        'EDUCORE';
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .fontSize(10)
        .font('Helvetica')
        .text('Enseignement Supérieur, Recherche et Innovation', {
          align: 'center',
        })
        .text(data.etudiant.etablissement?.address || '', { align: 'center' })
        .moveDown();

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('RELEVÉ DE NOTES ET RÉSULTATS', {
          align: 'center',
          underline: true,
        })
        .moveDown();

      // --- Informations Étudiant ---
      const startX = 50;
      let currentY = doc.y;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`NOM ET PRÉNOMS :`, startX, currentY)
        .font('Helvetica')
        .text(`${data.etudiant.nom}`, startX + 120, currentY);

      currentY += 15;
      doc
        .font('Helvetica-Bold')
        .text(`MATRICULE :`, startX, currentY)
        .font('Helvetica')
        .text(`${data.etudiant.matricule}`, startX + 120, currentY);

      currentY += 15;
      doc
        .font('Helvetica-Bold')
        .text(`CLASSE / NIVEAU :`, startX, currentY)
        .font('Helvetica')
        .text(
          `${data.etudiant.classe} / ${data.etudiant.niveau}`,
          startX + 120,
          currentY,
        );

      currentY += 15;
      doc
        .font('Helvetica-Bold')
        .text(`PÉRIODE :`, startX, currentY)
        .font('Helvetica')
        .text(`${data.semestre}`, startX + 120, currentY);

      doc.moveDown(2);

      // --- Tableau des Notes ---
      const tableTop = doc.y;
      const colMatiere = 50;
      const colCode = 250;
      const colCoef = 320;
      const colMoyenne = 380;
      const colResultat = 450;

      // Header du tableau
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('MATIÈRE', colMatiere, tableTop)
        .text('CODE', colCode, tableTop)
        .text('COEF', colCoef, tableTop)
        .text('MOYENNE', colMoyenne, tableTop)
        .text('RÉSULTAT', colResultat, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      let rowY = tableTop + 25;

      data.details.forEach((item: any) => {
        // Vérifier si on doit changer de page
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }

        doc
          .font('Helvetica')
          .fontSize(9)
          .text(item.nom, colMatiere, rowY, { width: 190 })
          .text(item.code, colCode, rowY)
          .text(item.coefficient.toString(), colCoef, rowY)
          .text(item.moyenne.toFixed(2), colMoyenne, rowY)
          .font(item.isEliminatoire ? 'Helvetica-Bold' : 'Helvetica')
          .text(
            item.isEliminatoire
              ? 'ÉLIMINATOIRE'
              : item.moyenne >= 10
                ? 'VALIDÉ'
                : 'À RATTRAPER',
            colResultat,
            rowY,
          );

        rowY += 20;
      });

      doc.moveTo(50, rowY).lineTo(550, rowY).stroke();

      rowY += 15;

      // --- Synthèse Finale ---
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(
          `MOYENNE GÉNÉRALE : ${data.moyenneGenerale.toFixed(2)} / 20`,
          colMatiere,
          rowY,
        );

      rowY += 20;
      const admissionStatus = data.decisions.isAdmis
        ? 'ADMIS(E)'
        : 'NON ADMIS(E)';
      const warning = data.decisions.hasEliminatoire
        ? ' (Sous réserve de note éliminatoire)'
        : '';

      doc
        .fontSize(12)
        .text(
          `DÉCISION DU JURY : ${admissionStatus}${warning}`,
          colMatiere,
          rowY,
        );

      // --- Signatures ---
      doc.moveDown(4);
      const signatureY = doc.y;

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Le Responsable Pédagogique', 50, signatureY)
        .text('Le Directeur des Études', 350, signatureY);

      doc.end();

      stream.on('finish', () => {
        resolve(`uploads/documents/${filename}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
