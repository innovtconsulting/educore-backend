import { MigrationInterface, QueryRunner } from 'typeorm';

export class DevoirManyToManyScopes20260808 implements MigrationInterface {
  name = 'DevoirManyToManyScopes20260808';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "devoir_classes" ("devoirId" integer NOT NULL, "classeId" integer NOT NULL, CONSTRAINT "PK_devoir_classes" PRIMARY KEY ("devoirId", "classeId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devoir_classes_devoirId" ON "devoir_classes" ("devoirId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devoir_classes_classeId" ON "devoir_classes" ("classeId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "devoir_niveaux" ("devoirId" integer NOT NULL, "niveauId" integer NOT NULL, CONSTRAINT "PK_devoir_niveaux" PRIMARY KEY ("devoirId", "niveauId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devoir_niveaux_devoirId" ON "devoir_niveaux" ("devoirId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devoir_niveaux_niveauId" ON "devoir_niveaux" ("niveauId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir_classes" ADD CONSTRAINT "FK_devoir_classes_devoirId" FOREIGN KEY ("devoirId") REFERENCES "devoir"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir_classes" ADD CONSTRAINT "FK_devoir_classes_classeId" FOREIGN KEY ("classeId") REFERENCES "classe"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir_niveaux" ADD CONSTRAINT "FK_devoir_niveaux_devoirId" FOREIGN KEY ("devoirId") REFERENCES "devoir"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir_niveaux" ADD CONSTRAINT "FK_devoir_niveaux_niveauId" FOREIGN KEY ("niveauId") REFERENCES "niveau"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Bascule des données existantes (classeId/niveauId scalaires) vers les
    // tables de jointure. Chaque niveau appartenant à exactement une classe
    // (niveau.classeId), un devoir dont "classeId" était NULL ("toutes les
    // classes du niveau") ne visait en réalité que la classe propriétaire de
    // ce niveau : on la rend explicite plutôt que de perdre l'information.
    await queryRunner.query(
      `INSERT INTO "devoir_niveaux" ("devoirId", "niveauId") SELECT "id", "niveauId" FROM "devoir" WHERE "niveauId" IS NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "devoir_classes" ("devoirId", "classeId") SELECT "id", "classeId" FROM "devoir" WHERE "classeId" IS NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO "devoir_classes" ("devoirId", "classeId") SELECT d."id", n."classeId" FROM "devoir" d JOIN "niveau" n ON n."id" = d."niveauId" WHERE d."classeId" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "devoir" DROP CONSTRAINT IF EXISTS "FK_dd09647a10e9975c4348b6451c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir" DROP CONSTRAINT IF EXISTS "FK_5491a103593c76073a4c2cd8630"`,
    );
    await queryRunner.query(`ALTER TABLE "devoir" DROP COLUMN "classeId"`);
    await queryRunner.query(`ALTER TABLE "devoir" DROP COLUMN "niveauId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "devoir" ADD "niveauId" integer`);
    await queryRunner.query(`ALTER TABLE "devoir" ADD "classeId" integer`);

    // Reprend arbitrairement le premier niveau/la première classe associés
    // (l'ancien modèle ne pouvait de toute façon représenter qu'un seul
    // niveau par devoir) — un rollback réel nécessiterait une revue manuelle
    // des devoirs multi-parcours créés depuis la migration "up".
    await queryRunner.query(
      `UPDATE "devoir" d SET "niveauId" = sub."niveauId" FROM (SELECT DISTINCT ON ("devoirId") "devoirId", "niveauId" FROM "devoir_niveaux" ORDER BY "devoirId", "niveauId") sub WHERE sub."devoirId" = d.id`,
    );
    await queryRunner.query(
      `UPDATE "devoir" d SET "classeId" = sub."classeId" FROM (SELECT DISTINCT ON ("devoirId") "devoirId", "classeId" FROM "devoir_classes" ORDER BY "devoirId", "classeId") sub WHERE sub."devoirId" = d.id`,
    );

    await queryRunner.query(
      `ALTER TABLE "devoir" ALTER COLUMN "niveauId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir" ADD CONSTRAINT "FK_dd09647a10e9975c4348b6451c7" FOREIGN KEY ("classeId") REFERENCES "classe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "devoir" ADD CONSTRAINT "FK_5491a103593c76073a4c2cd8630" FOREIGN KEY ("niveauId") REFERENCES "niveau"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`DROP TABLE "devoir_niveaux"`);
    await queryRunner.query(`DROP TABLE "devoir_classes"`);
  }
}
