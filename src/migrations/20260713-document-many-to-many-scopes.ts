import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentManyToManyScopes20260713 implements MigrationInterface {
  name = 'DocumentManyToManyScopes20260713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "document_classes" ("documentId" integer NOT NULL, "classeId" integer NOT NULL, CONSTRAINT "PK_document_classes" PRIMARY KEY ("documentId", "classeId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_classes_documentId" ON "document_classes" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_classes_classeId" ON "document_classes" ("classeId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_niveaux" ("documentId" integer NOT NULL, "niveauId" integer NOT NULL, CONSTRAINT "PK_document_niveaux" PRIMARY KEY ("documentId", "niveauId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_niveaux_documentId" ON "document_niveaux" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_niveaux_niveauId" ON "document_niveaux" ("niveauId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_classes" ADD CONSTRAINT "FK_document_classes_documentId" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_classes" ADD CONSTRAINT "FK_document_classes_classeId" FOREIGN KEY ("classeId") REFERENCES "classe"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_niveaux" ADD CONSTRAINT "FK_document_niveaux_documentId" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_niveaux" ADD CONSTRAINT "FK_document_niveaux_niveauId" FOREIGN KEY ("niveauId") REFERENCES "niveau"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Bascule des données existantes (classeId/niveauId scalaires) vers les tables de jointure
    await queryRunner.query(
      `INSERT INTO "document_classes" ("documentId", "classeId") SELECT "id", "classeId" FROM "document" WHERE "classeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "document_niveaux" ("documentId", "niveauId") SELECT "id", "niveauId" FROM "document" WHERE "niveauId" IS NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "classeId"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "niveauId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "niveauId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "classeId" integer`,
    );

    await queryRunner.query(
      `UPDATE "document" d SET "classeId" = dc."classeId" FROM "document_classes" dc WHERE dc."documentId" = d.id`,
    );
    await queryRunner.query(
      `UPDATE "document" d SET "niveauId" = dn."niveauId" FROM "document_niveaux" dn WHERE dn."documentId" = d.id`,
    );

    await queryRunner.query(`DROP TABLE "document_niveaux"`);
    await queryRunner.query(`DROP TABLE "document_classes"`);
  }
}
