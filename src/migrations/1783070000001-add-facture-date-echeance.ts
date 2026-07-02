import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFactureDateEcheance1783070000001
  implements MigrationInterface
{
  name = 'AddFactureDateEcheance1783070000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasFactureTable = await queryRunner.hasTable('facture');
    if (!hasFactureTable) return;

    const table = await queryRunner.getTable('facture');
    const hasDateEcheance = table?.findColumnByName('dateEcheance');
    if (hasDateEcheance) return;

    await queryRunner.query(
      `ALTER TABLE "facture" ADD "dateEcheance" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasFactureTable = await queryRunner.hasTable('facture');
    if (!hasFactureTable) return;

    const table = await queryRunner.getTable('facture');
    const hasDateEcheance = table?.findColumnByName('dateEcheance');
    if (!hasDateEcheance) return;

    await queryRunner.query(
      `ALTER TABLE "facture" DROP COLUMN "dateEcheance"`,
    );
  }
}
