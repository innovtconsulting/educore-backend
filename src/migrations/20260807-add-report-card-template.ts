import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportCardTemplate20260807 implements MigrationInterface {
  name = 'AddReportCardTemplate20260807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" ADD "reportCardTemplate" character varying NOT NULL DEFAULT 'DEFAULT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" DROP COLUMN "reportCardTemplate"`,
    );
  }
}
