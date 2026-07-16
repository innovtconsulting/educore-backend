import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademicFieldsToMatiere20260716
  implements MigrationInterface
{
  name = 'AddAcademicFieldsToMatiere20260716';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matiere" ADD "numeroUe" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "matiere" ADD "elementsConstitutifs" text`,
    );
    await queryRunner.query(`ALTER TABLE "matiere" ADD "tpTd" integer`);
    await queryRunner.query(`ALTER TABLE "matiere" ADD "tpe" integer`);
    await queryRunner.query(`ALTER TABLE "matiere" ADD "vht" integer`);
    await queryRunner.query(
      `ALTER TABLE "matiere" ADD "credits" numeric(5,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "credits"`);
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "vht"`);
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "tpe"`);
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "tpTd"`);
    await queryRunner.query(
      `ALTER TABLE "matiere" DROP COLUMN "elementsConstitutifs"`,
    );
    await queryRunner.query(`ALTER TABLE "matiere" DROP COLUMN "numeroUe"`);
  }
}
