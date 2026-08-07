import { AppDataSource } from '../data-source';
import { User, Role } from '../user/entities/user.entity';
import { Role as AclRole } from '../acl/entities/role.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// Établissement de test/démo volontairement exclu du côté super-admin
// (`visible: false` — absent des DTOs create/update, donc réglable
// uniquement ici ou en base directe). Il reste pleinement fonctionnel pour
// ses propres utilisateurs (son admin peut se connecter normalement), il
// n'apparaît simplement ni dans la liste des établissements du super-admin
// ni dans ses statistiques globales.
async function seedFutura() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('Connexion établie pour le seeding de FUTURA...');

    const userRepo = AppDataSource.getRepository(User);
    const roleAclRepo = AppDataSource.getRepository(AclRole);
    const etablissementRepo = AppDataSource.getRepository(Etablissement);

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Établissement FUTURA, masqué côté super-admin
    const etabEmail = 'contact@futura.test';
    let futura = await etablissementRepo.findOne({ where: { email: etabEmail } });
    if (!futura) {
      futura = etablissementRepo.create({
        name: 'FUTURA',
        address: 'Antananarivo, Madagascar',
        email: etabEmail,
        phone: '+261 34 00 000 00',
        visible: false,
      });
      await etablissementRepo.save(futura);
      console.log(`✅ Établissement créé : ${futura.name} (visible: false)`);
    } else if (futura.visible) {
      futura.visible = false;
      await etablissementRepo.save(futura);
      console.log(`✅ Établissement existant : ${futura.name} — visible mis à jour à false`);
    } else {
      console.log(`ℹ️ Établissement ${futura.name} existe déjà (visible: false).`);
    }

    // 2. Rôle ACL Admin (réutilisé s'il existe déjà, même logique que seed-admins.ts)
    let roleAdminAcl = await roleAclRepo.findOne({ where: { name: 'Admin' } });
    if (!roleAdminAcl) {
      roleAdminAcl = roleAclRepo.create({
        name: 'Admin',
        description: "Administrateur d'établissement",
      });
      await roleAclRepo.save(roleAdminAcl);
      console.log('✅ Rôle ACL Admin créé.');
    }

    // 3. Admin de FUTURA
    const adminEmail = 'futura@admin.com';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });

    if (!admin) {
      admin = userRepo.create({
        email: adminEmail,
        username: 'futura-admin',
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        aclRole: roleAdminAcl,
        etablissement: futura,
        etablissementId: futura.id,
      });
      await userRepo.save(admin);
      console.log(`✅ Admin créé : ${adminEmail} / password123 (lié à ${futura.name})`);
    } else if (!admin.etablissementId) {
      admin.etablissement = futura;
      admin.etablissementId = futura.id;
      await userRepo.save(admin);
      console.log(`✅ Admin mis à jour : établissement assigné (${futura.name})`);
    } else {
      console.log(`ℹ️ Admin ${adminEmail} existe déjà (lié à l'établissement ID ${admin.etablissementId}).`);
    }

    console.log('🚀 Seeding de FUTURA terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seeding de FUTURA :', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedFutura();
