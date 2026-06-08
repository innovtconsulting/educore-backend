import { DataSource } from 'typeorm';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: [Etablissement, Niveau, Classe, Matiere, Enseignant, Affectation, EmploiDuTemp],
  synchronize: false,
});

async function seed() {
  try {
    await dataSource.initialize();
    console.log('Connexion établie pour le seeding...');

    const etablissementRepo = dataSource.getRepository(Etablissement);
    const niveauRepo = dataSource.getRepository(Niveau);
    const classeRepo = dataSource.getRepository(Classe);
    const matiereRepo = dataSource.getRepository(Matiere);
    const enseignantRepo = dataSource.getRepository(Enseignant);
    const affectationRepo = dataSource.getRepository(Affectation);

    // 1. Établissements
    const fst = etablissementRepo.create({
      name: 'Faculté des Sciences et Techniques (FST)',
      address: 'UCAD, Dakar',
      email: 'contact.fst@ucad.edu.sn',
      phone: '+221 33 825 00 00',
    });
    const esp = etablissementRepo.create({
      name: 'École Supérieure Polytechnique (ESP)',
      address: 'Avenue Cheikh Anta Diop, Dakar',
      email: 'contact.esp@ucad.edu.sn',
      phone: '+221 33 864 51 96',
    });
    await etablissementRepo.save([fst, esp]);

    // 2. Niveaux
    const l1 = niveauRepo.create({ name: 'Licence 1' });
    const l2 = niveauRepo.create({ name: 'Licence 2' });
    const l3 = niveauRepo.create({ name: 'Licence 3' });
    const m1 = niveauRepo.create({ name: 'Master 1' });
    const m2 = niveauRepo.create({ name: 'Master 2' });
    await niveauRepo.save([l1, l2, l3, m1, m2]);

    // 3. Classes
    const informatique = classeRepo.create({
      name: 'Informatique',
      niveaux: [l1, l2, l3, m1, m2],
      etablissements: [fst, esp],
    });
    const mathematiques = classeRepo.create({
      name: 'Mathématiques',
      niveaux: [l1, l2, l3],
      etablissements: [fst],
    });
    await classeRepo.save([informatique, mathematiques]);

    // 4. Matières
    const algo = matiereRepo.create({
      code: 'INF101',
      name: 'Algorithmique 1',
      coefficient: 4,
      classes: [informatique],
      niveaux: [l1],
    });
    const baseDonnees = matiereRepo.create({
      code: 'INF201',
      name: 'Bases de Données',
      coefficient: 3,
      classes: [informatique],
      niveaux: [l2],
    });
    const reseaux = matiereRepo.create({
      code: 'INF301',
      name: 'Réseaux Informatiques',
      coefficient: 3,
      classes: [informatique],
      niveaux: [l3],
    });
    await matiereRepo.save([algo, baseDonnees, reseaux]);

    // 5. Enseignants
    const profDiallo = enseignantRepo.create({
      firstName: 'Moussa',
      lastName: 'Diallo',
      email: 'moussa.diallo@ucad.edu.sn',
      matricule: 'FST-INF-001',
      dateEmbauche: new Date('2020-01-01'),
      phone: '+221 77 123 45 67',
    });
    const profSow = enseignantRepo.create({
      firstName: 'Mariam',
      lastName: 'Sow',
      email: 'mariam.sow@ucad.edu.sn',
      matricule: 'FST-MAT-001',
      dateEmbauche: new Date('2021-01-01'),
      phone: '+221 77 987 65 43',
    });
    await enseignantRepo.save([profDiallo, profSow]);

    // 6. Affectations
    const aff1 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: algo,
      etablissement: fst,
      niveau: l1,
    });
    const aff2 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: baseDonnees,
      etablissement: esp,
      niveau: l2,
    });
    const aff3 = affectationRepo.create({
      enseignant: profSow,
      matiere: algo,
      etablissement: fst,
      niveau: l1,
    });
    await affectationRepo.save([aff1, aff2, aff3]);

    console.log('Seeding terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seeding :', error);
  } finally {
    await dataSource.destroy();
  }
}

seed();
