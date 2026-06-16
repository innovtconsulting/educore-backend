import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Paiement } from '../entities/paiement.entity';
import { Facture } from '../entities/facture.entity';

export async function generateReceiptPdf(paiement: Paiement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `receipt_${paiement.reference}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'receipts');
      
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      const schoolName = paiement.etudiant.etablissement?.name?.toUpperCase() || 'REÇU DE PAIEMENT';
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .fontSize(14)
        .text('REÇU DE PAIEMENT', { align: 'center' })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Référence: ${paiement.reference}`)
        .text(`Date: ${new Date(paiement.datePaiement).toLocaleDateString()}`)
        .moveDown();

      // Student Info
      doc
        .fontSize(14)
        .text('Informations Étudiant', { underline: true })
        .fontSize(12)
        .text(`Nom: ${paiement.etudiant.lastName} ${paiement.etudiant.firstName}`)
        .text(`Matricule: ${paiement.etudiant.matricule}`)
        .moveDown();

      // Payment details
      doc
        .fontSize(14)
        .text('Détails du Paiement', { underline: true })
        .fontSize(12)
        .text(`Montant payé: ${paiement.montant} FCFA`)
        .text(`Mode de paiement: ${paiement.modePaiement}`);

      if (paiement.facture) {
        doc.text(`Lié à la facture: ${paiement.facture.numero}`);
      }

      doc.moveDown(2);
      doc
        .fontSize(10)
        .text('Merci pour votre paiement.', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        // Return relative path for web access
        resolve(`uploads/receipts/${filename}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateQuittancePdf(facture: Facture): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `quittance_${facture.numero}_${Date.now()}.pdf`;
      const directory = path.join(process.cwd(), 'uploads', 'receipts');
      
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = path.join(directory, filename);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      const schoolName = facture.etudiant.etablissement?.name?.toUpperCase() || 'QUITTANCE DE PAIEMENT DÉFINITIVE';
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(schoolName, { align: 'center' })
        .fontSize(14)
        .text('QUITTANCE DE PAIEMENT DÉFINITIVE', { align: 'center' })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Numéro de Facture: ${facture.numero}`)
        .text(`Date de Solde: ${new Date().toLocaleDateString()}`)
        .moveDown();

      // Student Info
      doc
        .fontSize(14)
        .text('Informations Étudiant', { underline: true })
        .fontSize(12)
        .text(`Nom: ${facture.etudiant.lastName} ${facture.etudiant.firstName}`)
        .text(`Matricule: ${facture.etudiant.matricule}`)
        .moveDown();

      // Statement
      doc
        .fontSize(14)
        .text('Objet de la Quittance', { underline: true })
        .fontSize(12)
        .text(`Nous soussignés, certifions que l'étudiant susmentionné s'est acquitté de l'intégralité des frais liés à la facture ${facture.numero}.`)
        .moveDown();

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`Montant Total Honoré: ${facture.montantTotal} FCFA`)
        .moveDown();

      doc.moveDown(3);
      doc
        .fontSize(12)
        .text('Fait à Dakar, pour valoir ce que de droit.', { align: 'right' });

      doc.end();

      stream.on('finish', () => {
        resolve(`uploads/receipts/${filename}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
