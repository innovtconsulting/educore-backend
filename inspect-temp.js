const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  });
  await client.connect();

  const classe = await client.query(
    `SELECT id, name, "etablissementId" FROM classe WHERE name ILIKE '%maieutique%'`,
  );
  console.log('--- Classe "Maieutique" ---');
  console.log(classe.rows);

  if (classe.rows.length > 0) {
    const classeId = classe.rows[0].id;
    const niveaux = await client.query(
      `SELECT id, name, "classeId", "etablissementId" FROM niveau WHERE "classeId" = $1`,
      [classeId],
    );
    console.log('--- Niveaux de cette classe ---');
    console.log(niveaux.rows);

    const etudiants = await client.query(
      `SELECT id, "firstName", "lastName", "classeId", "niveauId", "etablissementId" FROM etudiant WHERE "classeId" = $1`,
      [classeId],
    );
    console.log('--- Etudiants dans cette classe ---');
    console.log(etudiants.rows);
  }

  const comptables = await client.query(
    `SELECT id, email, role, "etablissementId" FROM "user" WHERE role = 'COMPTABLE'`,
  );
  console.log('--- Comptes COMPTABLE ---');
  console.log(comptables.rows);

  const admins = await client.query(
    `SELECT id, email, role, "etablissementId" FROM "user" WHERE role IN ('ADMIN','SUPER_ADMIN')`,
  );
  console.log('--- Comptes ADMIN/SUPER_ADMIN ---');
  console.log(admins.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
