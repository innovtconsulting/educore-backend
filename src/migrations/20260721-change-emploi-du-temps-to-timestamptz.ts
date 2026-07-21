import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeEmploiDuTempsToTimestamptz20260721 implements MigrationInterface {
  name = 'ChangeEmploiDuTempsToTimestamptz20260721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ALTER COLUMN "startTime" TYPE timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ALTER COLUMN "endTime" TYPE timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ALTER COLUMN "startTime" TYPE timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "emploi_du_temp" ALTER COLUMN "endTime" TYPE timestamp`,
    );
  }
}
