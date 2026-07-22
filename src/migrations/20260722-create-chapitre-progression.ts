import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChapitreProgression20260722 implements MigrationInterface {
  name = 'CreateChapitreProgression20260722';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chapitre_progression" (
        "id" SERIAL NOT NULL,
        "matiereId" integer NOT NULL,
        "niveauId" integer NOT NULL,
        "anneeUniversitaireId" integer NOT NULL,
        "chapitreId" uuid NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "completedById" integer,
        "completedByName" character varying,
        "completedByRole" character varying,
        "completedAt" TIMESTAMPTZ,
        "etablissementId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_chapitre_progression_tuple" UNIQUE ("matiereId", "niveauId", "anneeUniversitaireId", "chapitreId"),
        CONSTRAINT "PK_chapitre_progression" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" ADD CONSTRAINT "FK_chapitre_progression_matiere" FOREIGN KEY ("matiereId") REFERENCES "matiere"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" ADD CONSTRAINT "FK_chapitre_progression_niveau" FOREIGN KEY ("niveauId") REFERENCES "niveau"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" ADD CONSTRAINT "FK_chapitre_progression_annee" FOREIGN KEY ("anneeUniversitaireId") REFERENCES "annee_universitaire"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" ADD CONSTRAINT "FK_chapitre_progression_etablissement" FOREIGN KEY ("etablissementId") REFERENCES "etablissement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" ADD CONSTRAINT "FK_chapitre_progression_completed_by" FOREIGN KEY ("completedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" DROP CONSTRAINT "FK_chapitre_progression_completed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" DROP CONSTRAINT "FK_chapitre_progression_etablissement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" DROP CONSTRAINT "FK_chapitre_progression_annee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" DROP CONSTRAINT "FK_chapitre_progression_niveau"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapitre_progression" DROP CONSTRAINT "FK_chapitre_progression_matiere"`,
    );
    await queryRunner.query(`DROP TABLE "chapitre_progression"`);
  }
}
