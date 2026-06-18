import { AppDataSource } from '../data-source';
import { User, Role } from '../user/entities/user.entity';
import { Role as AclRole } from '../acl/entities/role.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedAdmins() {
  try {
    // Initialisation de la connexion à la base de données
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('Connexion établie pour le seeding des administrateurs...');

    const userRepo = AppDataSource.getRepository(User);
    const roleAclRepo = AppDataSource.getRepository(AclRole);
    const etablissementRepo = AppDataSource.getRepository(Etablissement);

    // Hashage du mot de passe par défaut
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Création du SuperAdmin (Accès global)
    const superAdminEmail = 'superadmin@espm.sn';
    let superAdmin = await userRepo.findOne({
      where: { email: superAdminEmail },
    });

    if (!superAdmin) {
      superAdmin = userRepo.create({
        email: superAdminEmail,
        username: 'superadmin',
        password: passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
      });
      await userRepo.save(superAdmin);
      console.log(`✅ SuperAdmin créé : ${superAdminEmail} / password123`);
    } else {
      console.log('ℹ️ SuperAdmin existe déjà.');
    }

    // 2. Création du Rôle ACL Admin si nécessaire
    let roleAdminAcl = await roleAclRepo.findOne({ where: { name: 'Admin' } });
    if (!roleAdminAcl) {
      roleAdminAcl = roleAclRepo.create({
        name: 'Admin',
        description: "Administrateur d'établissement",
      });
      await roleAclRepo.save(roleAdminAcl);
      console.log('✅ Rôle ACL Admin créé.');
    }

    // 3. Création de l'Admin d'établissement
    const adminEmail = 'admin@espm.sn';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });

    if (!admin) {
      // On tente de lier l'admin au premier établissement trouvé
      const firstEtab = await etablissementRepo.findOne({ where: {} });

      admin = userRepo.create({
        email: adminEmail,
        username: 'admin',
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        aclRole: roleAdminAcl,
        etablissement: firstEtab || undefined,
      });
      await userRepo.save(admin);
      const etabInfo = firstEtab
        ? ` (Lié à ${firstEtab.name})`
        : ' (Sans établissement)';
      console.log(`✅ Admin créé : ${adminEmail} / password123${etabInfo}`);
    } else {
      console.log('ℹ️ Admin existe déjà.');
    }

    console.log('🚀 Seeding des administrateurs terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seeding des administrateurs :', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedAdmins();
