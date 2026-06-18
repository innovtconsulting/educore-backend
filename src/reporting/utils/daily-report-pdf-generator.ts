import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export async function generateDailyReportPdf(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `rapport_quotidien_${data.date}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'documents');

      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- En-tête ---
      const schoolName =
        data.etablissement?.name?.toUpperCase() ||
        'ÉCOLE SUPÉRIEURE POLYTECHNIQUE';
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .text('RAPPORT QUOTIDIEN DU SURVEILLANT', { align: 'center' })
        .moveDown();

      doc
        .fontSize(10)
        .text(`Date : ${data.date}`, { align: 'right' })
        .text(`Surveillant : ${data.supervisorName}`, { align: 'right' })
        .moveDown();

      // --- Résumé ---
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('SYNTHÈSE DE LA JOURNÉE', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Nombre total d'absences : ${data.summary.totalAbsences}`)
        .text(`Nombre total de retards : ${data.summary.totalRetards}`)
        .text(`Nombre total de sanctions : ${data.summary.totalSanctions}`)
        .moveDown();

      // --- Observations ---
      if (data.observations) {
        doc
          .font('Helvetica-Bold')
          .text('OBSERVATIONS :')
          .font('Helvetica')
          .text(data.observations)
          .moveDown();
      }

      // --- Détails Absences ---
      if (data.absences.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('DÉTAIL DES ABSENCES', { underline: true })
          .moveDown(0.5);

        data.absences.forEach((a: any) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${a.etudiant} (${a.classe})`, { continued: true })
            .font('Helvetica')
            .text(
              ` - Matière : ${a.matiere} - Remarque : ${a.remarque || 'N/A'}`,
            );
        });
        doc.moveDown();
      }

      // --- Détails Retards ---
      if (data.retards.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('DÉTAIL DES RETARDS', { underline: true })
          .moveDown(0.5);

        data.retards.forEach((r: any) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${r.etudiant} (${r.classe})`, { continued: true })
            .font('Helvetica')
            .text(
              ` - Matière : ${r.matiere} - Remarque : ${r.remarque || 'N/A'}`,
            );
        });
        doc.moveDown();
      }

      // --- Détails Sanctions ---
      if (data.sanctions.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('DÉTAIL DES SANCTIONS', { underline: true })
          .moveDown(0.5);

        data.sanctions.forEach((s: any) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${s.etudiant}`, { continued: true })
            .font('Helvetica')
            .text(` - Type : ${s.type} - Motif : ${s.motif}`);
        });
        doc.moveDown();
      }

      // --- Pied de page ---
      const footerY = 750;
      doc
        .fontSize(8)
        .text(
          'Document généré automatiquement par le système de gestion.',
          50,
          footerY,
          { align: 'center' },
        );

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
