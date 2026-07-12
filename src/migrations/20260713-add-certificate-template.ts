import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificateTemplate20260713 implements MigrationInterface {
  name = 'AddCertificateTemplate20260713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" ADD "certificateTemplate" character varying NOT NULL DEFAULT 'DEFAULT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" DROP COLUMN "certificateTemplate"`,
    );
  }
}
