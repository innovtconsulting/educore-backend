import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmploiDuTempType20260713 implements MigrationInterface {
  name = 'AddEmploiDuTempType20260713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ADD "type" character varying NOT NULL DEFAULT 'Cours'`,
    );
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ADD "title" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ADD "groupeId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_emploi_du_temp_groupeId" ON "emploi_du_temp" ("groupeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_emploi_du_temp_groupeId"`);
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" DROP COLUMN "groupeId"`,
    );
    await queryRunner.query(`ALTER TABLE "emploi_du_temp" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "emploi_du_temp" DROP COLUMN "type"`);
  }
}
