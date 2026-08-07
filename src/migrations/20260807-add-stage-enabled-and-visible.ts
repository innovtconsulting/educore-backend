import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStageEnabledAndVisible20260807 implements MigrationInterface {
  name = 'AddStageEnabledAndVisible20260807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "etablissement" ADD "stageEnabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "etablissement" ADD "visible" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "etablissement" DROP COLUMN "visible"`);
    await queryRunner.query(`ALTER TABLE "etablissement" DROP COLUMN "stageEnabled"`);
  }
}
