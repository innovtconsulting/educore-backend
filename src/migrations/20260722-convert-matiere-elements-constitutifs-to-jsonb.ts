import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertMatiereElementsConstitutifsToJsonb20260722
  implements MigrationInterface
{
  name = 'ConvertMatiereElementsConstitutifsToJsonb20260722';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matiere" RENAME COLUMN "elementsConstitutifs" TO "elementsConstitutifsLegacyHtml"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matiere" ADD "elementsConstitutifs" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matiere" DROP COLUMN "elementsConstitutifs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matiere" RENAME COLUMN "elementsConstitutifsLegacyHtml" TO "elementsConstitutifs"`,
    );
  }
}
