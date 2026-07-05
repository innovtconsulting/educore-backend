import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBaccSerieToEtudiant1783072000000
  implements MigrationInterface
{
  name = 'AddBaccSerieToEtudiant1783072000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasEtudiantTable = await queryRunner.hasTable('etudiant');
    if (!hasEtudiantTable) return;

    const table = await queryRunner.getTable('etudiant');
    const hasBaccSerie = table?.findColumnByName('baccSerie');

    if (!hasBaccSerie) {
      await queryRunner.query(
        `ALTER TABLE "etudiant" ADD "baccSerie" character varying`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "etudiant" DROP CONSTRAINT IF EXISTS "CHK_etudiant_baccSerie_allowed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "etudiant" ADD CONSTRAINT "CHK_etudiant_baccSerie_allowed" CHECK ("baccSerie" IS NULL OR "baccSerie" IN ('A', 'C', 'D', 'S', 'OSE'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasEtudiantTable = await queryRunner.hasTable('etudiant');
    if (!hasEtudiantTable) return;

    const table = await queryRunner.getTable('etudiant');

    await queryRunner.query(
      `ALTER TABLE "etudiant" DROP CONSTRAINT IF EXISTS "CHK_etudiant_baccSerie_allowed"`,
    );

    if (table?.findColumnByName('baccSerie')) {
      await queryRunner.query(`ALTER TABLE "etudiant" DROP COLUMN "baccSerie"`);
    }
  }
}
