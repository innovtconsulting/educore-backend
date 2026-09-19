import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

function isParamedicalReportTemplate(etablissement: any): boolean {
  return etablissement?.reportCardTemplate === 'ESPM' || etablissement?.reportCardTemplate === 'ESPA';
}

function drawDefaultHeader(doc: PDFKit.PDFDocument, etablissement: any): void {
  // Logo si disponible
  const logoPath = etablissement?.logoPath ? path.join(process.cwd(), etablissement.logoPath) : null;
  let hasLogo = false;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, 30, { width: 45, height: 45 });
      hasLogo = true;
    } catch {}
  }

  const schoolName = etablissement?.name?.toUpperCase() || 'ÉTABLISSEMENT';
  const centerX = hasLogo ? 80 : 50;
  const width = hasLogo ? 470 : 500;

  // Nom établissement
  doc.fontSize(14).font('Helvetica-Bold').text(schoolName, centerX, hasLogo ? 35 : 35, {
    align: hasLogo ? 'left' : 'center',
    width,
  });

  if (etablissement?.address) {
    doc.fontSize(9).font('Helvetica').text(etablissement.address, centerX, doc.y, {
      align: hasLogo ? 'left' : 'center',
      width,
    });
  }
  const contact = [etablissement?.email, etablissement?.phone].filter(Boolean).join('  ·  ');
  if (contact) {
    doc.fontSize(8).text(contact, centerX, doc.y + 2, { align: hasLogo ? 'left' : 'center', width });
  }

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.8);

  doc.fontSize(14).font('Helvetica-Bold').text('RELEVÉ DE NOTES ET RÉSULTATS', 50, doc.y, {
    align: 'center',
  });
  doc.moveDown(0.8);
}

function drawParamedicalHeader(doc: PDFKit.PDFDocument, etablissement: any, data: any): void {
  // Bloc gauche
  let leftY = 30;
  doc.fontSize(11).font('Helvetica-Bold').text(etablissement?.name ?? 'ÉTABLISSEMENT', 50, leftY, { width: 280 });
  leftY = doc.y + 2;

  doc.fontSize(8).font('Helvetica').text(etablissement?.address ?? '', 50, leftY, { width: 280 });
  leftY = doc.y + 2;

  const contact = [etablissement?.email, etablissement?.phone].filter(Boolean).join('  ·  ');
  if (contact) {
    doc.text(contact, 50, leftY, { width: 280 });
    leftY = doc.y + 2;
  }

  doc.fontSize(7).text('Formation paramédicale habilitée par le MESupRES', 50, leftY, { width: 280 });
  leftY = doc.y + 1;
  doc.text('Reconnue par la Fonction Publique — Arrêté N° 12.258/2022-MESupRES', 50, leftY, { width: 280 });
  leftY = doc.y + 4;
  doc.fontSize(8).font('Helvetica-Bold').text('DISCIPLINE — HONNÊTETÉ — COMPÉTENCE', 50, leftY, { width: 280 });
  leftY = doc.y + 4;

  // Bloc droit
  const rightX = 350;
  doc.fontSize(13).font('Helvetica-Bold').text('RELEVÉ DE NOTES', rightX, 30, { width: 200, align: 'right' });
  const periodLabel = [data.etudiant?.niveau, data.semestre].filter(Boolean).join(' · ');
  if (periodLabel) {
    doc.fontSize(8).font('Helvetica').text(periodLabel, rightX, 48, { width: 200, align: 'right' });
  }

  // Pastille décision
  const badgeLabel = data.decisions?.isAdmis ? 'ADMIS(E)' : 'NON ADMIS(E)';
  const badgeX = 450;
  const badgeY = 62;
  doc.circle(badgeX, badgeY, 18).strokeColor('#0f6252').lineWidth(0.8).stroke();
  doc.fillColor('#0f6252').fontSize(7).font('Helvetica-Bold').text(badgeLabel, badgeX - 18, badgeY - 4, { width: 36, align: 'center' });
  doc.fillColor('black');

  const headerBottom = Math.max(leftY, badgeY + 22) + 6;
  doc.y = headerBottom;
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('black').lineWidth(0.5).stroke();
  doc.moveDown(0.8);
}

function drawDefaultFooter(doc: PDFKit.PDFDocument): void {
  doc.fontSize(9).font('Helvetica').text('Le Responsable Pédagogique', 50, doc.y);
  doc.text('Le Directeur des Études', 350, doc.y - 12, { width: 200, align: 'left' });
}

function drawParamedicalFooter(doc: PDFKit.PDFDocument): void {
  let y = doc.y + 20;
  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fontSize(9).font('Helvetica').text(`Fait à Antananarivo, le ${today}`, 350, y, { width: 200, align: 'right' });
  y = doc.y + 8;
  doc.font('Helvetica-Bold').text('LE DIRECTEUR PÉDAGOGIQUE', 350, y, { width: 200, align: 'right' });
  y = doc.y + 20;
  doc.moveTo(490, y).lineTo(550, y).stroke();
  y += 6;
  doc.fontSize(9).font('Helvetica').text('RATOHAMANIRISON Jean Marc Théodore', 350, y, { width: 200, align: 'right' });
}

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

      // --- En-tête unifié (même logique que frontend) ---
      const paramedical = isParamedicalReportTemplate(data.etudiant.etablissement);
      if (paramedical) {
        drawParamedicalHeader(doc, data.etudiant.etablissement, data);
      } else {
        drawDefaultHeader(doc, data.etudiant.etablissement);
      }

      // --- Informations Étudiant ---
      const startX = 50;
      let currentY = doc.y;

      doc.fontSize(11).font('Helvetica-Bold').text(`NOM ET PRÉNOMS :`, startX, currentY).font('Helvetica').text(`${data.etudiant.nom}`, startX + 120, currentY);
      currentY += 15;
      doc.font('Helvetica-Bold').text(`MATRICULE :`, startX, currentY).font('Helvetica').text(`${data.etudiant.matricule}`, startX + 120, currentY);
      currentY += 15;
      doc.font('Helvetica-Bold').text(`CLASSE / NIVEAU :`, startX, currentY).font('Helvetica').text(`${data.etudiant.classe} / ${data.etudiant.niveau}`, startX + 120, currentY);
      currentY += 15;
      doc.font('Helvetica-Bold').text(`PÉRIODE :`, startX, currentY).font('Helvetica').text(`${data.semestre}`, startX + 120, currentY);
      doc.y = currentY + 15;

      // --- Tableau des Notes ---
      const tableTop = doc.y;
      const colMatiere = 50;
      const colCode = 250;
      const colCoef = 320;
      const colMoyenne = 380;
      const colResultat = 450;

      doc.font('Helvetica-Bold').fontSize(10).text('MATIÈRE', colMatiere, tableTop).text('CODE', colCode, tableTop).text('COEF', colCoef, tableTop).text('MOYENNE', colMoyenne, tableTop).text('RÉSULTAT', colResultat, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let rowY = tableTop + 25;

      data.details.forEach((item: any) => {
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }
        doc.font('Helvetica').fontSize(9).text(item.nom, colMatiere, rowY, { width: 190 }).text(item.code, colCode, rowY).text(item.coefficient.toString(), colCoef, rowY).text(item.moyenne.toFixed(2), colMoyenne, rowY).font(item.isEliminatoire ? 'Helvetica-Bold' : 'Helvetica').text(item.isEliminatoire ? 'ÉLIMINATOIRE' : item.moyenne >= 10 ? 'VALIDÉ' : 'À RATTRAPER', colResultat, rowY);
        rowY += 20;
      });

      doc.moveTo(50, rowY).lineTo(550, rowY).stroke();
      rowY += 15;

      doc.fontSize(12).font('Helvetica-Bold').text(`MOYENNE GÉNÉRALE : ${data.moyenneGenerale.toFixed(2)} / 20`, colMatiere, rowY);
      rowY += 20;
      const admissionStatus = data.decisions.isAdmis ? 'ADMIS(E)' : 'NON ADMIS(E)';
      const warning = data.decisions.hasEliminatoire ? ' (Sous réserve de note éliminatoire)' : '';
      doc.fontSize(12).text(`DÉCISION DU JURY : ${admissionStatus}${warning}`, colMatiere, rowY);
      doc.y = rowY + 30;

      // --- Signatures (même logique que frontend) ---
      if (paramedical) {
        drawParamedicalFooter(doc);
      } else {
        drawDefaultFooter(doc);
      }

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
