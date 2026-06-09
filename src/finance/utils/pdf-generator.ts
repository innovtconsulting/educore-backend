import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Paiement } from '../entities/paiement.entity';

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
      doc
        .fontSize(20)
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
