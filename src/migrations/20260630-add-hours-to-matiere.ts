import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHoursToMatiere20260630 implements MigrationInterface {
  name = 'AddHoursToMatiere20260630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matiere" ADD "hours" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "hours"`);
  }
}
