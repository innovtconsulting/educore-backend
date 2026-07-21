import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSurveillantToMonitrice20260720 implements MigrationInterface {
  name = 'RenameSurveillantToMonitrice20260720';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user" SET "role" = 'Monitrice' WHERE "role" = 'Surveillant'`,
    );
    await queryRunner.query(
      `ALTER TYPE "user_role_enum" RENAME VALUE 'Surveillant' TO 'Monitrice'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user" SET "role" = 'Surveillant' WHERE "role" = 'Monitrice'`,
    );
    await queryRunner.query(
      `ALTER TYPE "user_role_enum" RENAME VALUE 'Monitrice' TO 'Surveillant'`,
    );
  }
}
