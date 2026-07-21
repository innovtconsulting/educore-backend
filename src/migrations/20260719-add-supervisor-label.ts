import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupervisorLabel20260719 implements MigrationInterface {
  name = 'AddSupervisorLabel20260719';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" ADD "supervisorLabel" character varying NOT NULL DEFAULT 'Monitrice'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" DROP COLUMN "supervisorLabel"`,
    );
  }
}
