import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export async function generateScolarityCertificatePdf(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `certificat_scolarite_${data.matricule}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'documents');
      
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- En-tête ---
      const schoolName = data.etablissement?.name?.toUpperCase() || 'ÉCOLE SUPÉRIEURE POLYTECHNIQUE';
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(data.etablissement.address, { align: 'center' })
        .text(`Email : ${data.etablissement.email} | Tél : ${data.etablissement.phone}`, { align: 'center' })
        .moveDown(2);

      // --- Titre ---
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('CERTIFICAT DE SCOLARITÉ', { align: 'center', underline: true })
        .moveDown(2);

      // --- Corps ---
      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Le Directeur de l\'établissement soussigné, certifie que :', { lineGap: 10 })
        .moveDown();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`M./Mlle : ${data.firstName} ${data.lastName.toUpperCase()}`, { indent: 20 })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Né(e) le : ${data.birthDate || 'N/A'} à ${data.birthPlace || 'N/A'}`, { indent: 20 })
        .text(`Matricule : ${data.matricule}`, { indent: 20 })
        .moveDown();

      doc
        .text('Est régulièrement inscrit(e) au titre de l\'année universitaire ', { continued: true })
        .font('Helvetica-Bold')
        .text(data.anneeUniversitaire)
        .font('Helvetica')
        .text('pour suivre les cours en :')
        .moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text(`CLASSE : ${data.classe}`, { indent: 40 })
        .text(`NIVEAU : ${data.niveau}`, { indent: 40 })
        .moveDown(2);

      doc
        .font('Helvetica')
        .text('En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.')
        .moveDown(2);

      // --- Date et Signature ---
      const today = new Date().toLocaleDateString('fr-FR');
      doc
        .text(`Fait à Dakar, le ${today}`, { align: 'right' })
        .moveDown()
        .font('Helvetica-Bold')
        .text('Le Directeur', { align: 'right', indent: 50 });

      // --- Pied de page ---
      const footerY = 750;
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Ce document est une pièce officielle. Toute rature ou surcharge l\'annule.', 50, footerY, { align: 'center' });

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

export async function generateSuccessAttestationPdf(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `attestation_reussite_${data.matricule}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'documents');
      
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // --- En-tête ---
      const schoolName = data.etablissement?.name?.toUpperCase() || 'ÉCOLE SUPÉRIEURE POLYTECHNIQUE';
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .moveDown(2);

      // --- Titre ---
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('ATTESTATION DE RÉUSSITE', { align: 'center', underline: true })
        .moveDown(2);

      // --- Corps ---
      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Le Directeur de l\'établissement soussigné, certifie que l\'étudiant(e) :', { lineGap: 10 })
        .moveDown();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`${data.firstName} ${data.lastName.toUpperCase()}`, { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .text(`Matricule : ${data.matricule}`, { align: 'center' })
        .moveDown();

      doc
        .text('A été déclaré(e) ADMIS(E) à la suite des épreuves de l\'année universitaire ', { continued: true })
        .font('Helvetica-Bold')
        .text(data.anneeUniversitaire)
        .font('Helvetica')
        .text('pour le cursus :')
        .moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text(`${data.classe} - ${data.niveau}`, { align: 'center' })
        .moveDown();

      doc
        .font('Helvetica')
        .text('Avec les résultats suivants :', { indent: 20 })
        .moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text(`MOYENNE GÉNÉRALE : ${data.moyenneGenerale} / 20`, { indent: 40 })
        .text(`MENTION : ${data.mention}`, { indent: 40 })
        .moveDown(2);

      doc
        .font('Helvetica')
        .text('En foi de quoi, la présente attestation est délivrée pour servir et valoir ce que de droit.')
        .moveDown(3);

      // --- Date et Signature ---
      const today = new Date().toLocaleDateString('fr-FR');
      const schoolSimpleName = data.etablissement?.name || 'l\'établissement';
      doc
        .text(`Fait à Dakar, le ${today}`, { align: 'right' })
        .moveDown()
        .font('Helvetica-Bold')
        .text(`Le Directeur de ${schoolSimpleName}`, { align: 'right' });

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
