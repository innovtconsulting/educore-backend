import { AppDataSource } from '../data-source';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import * as dotenv from 'dotenv';

dotenv.config();

// Établissement de test/démo volontairement exclu du côté super-admin
// (`visible: false` — absent des DTOs create/update, donc réglable
// uniquement ici ou en base directe). Même logique que seed-futura.ts.
async function seedCherubin() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('Connexion établie pour le seeding de CHERUBIN...');

    const etablissementRepo = AppDataSource.getRepository(Etablissement);

    const etabEmail = 'cherubin@admin.com';
    let cherubin = await etablissementRepo.findOne({ where: { email: etabEmail } });
    if (!cherubin) {
      cherubin = etablissementRepo.create({
        name: 'CHERUBIN',
        address: 'Antananarivo, Madagascar',
        email: etabEmail,
        phone: '+261 34 00 000 01',
        visible: false,
      });
      await etablissementRepo.save(cherubin);
      console.log(`✅ Établissement créé : ${cherubin.name} (visible: false)`);
    } else if (cherubin.visible) {
      cherubin.visible = false;
      await etablissementRepo.save(cherubin);
      console.log(`✅ Établissement existant : ${cherubin.name} — visible mis à jour à false`);
    } else {
      console.log(`ℹ️ Établissement ${cherubin.name} existe déjà (visible: false).`);
    }

    console.log('🚀 Seeding de CHERUBIN terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seeding de CHERUBIN :', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedCherubin();
