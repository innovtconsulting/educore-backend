import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournal20260712 implements MigrationInterface {
  name = 'CreateJournal20260712';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "journal" ("id" SERIAL NOT NULL, "emploiDuTempId" integer NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "objectives" text, "homework" text, "remarks" text, "createdById" integer NOT NULL, "createdByName" character varying NOT NULL, "createdByRole" character varying NOT NULL, "lastModifiedById" integer NOT NULL, "lastModifiedByName" character varying NOT NULL, "lastModifiedByRole" character varying NOT NULL, "etablissementId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_journal_emploiDuTempId" UNIQUE ("emploiDuTempId"), CONSTRAINT "PK_journal" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "journal_history" ("id" SERIAL NOT NULL, "journalId" integer NOT NULL, "action" character varying NOT NULL, "performedById" integer NOT NULL, "performedByName" character varying NOT NULL, "performedByRole" character varying NOT NULL, "snapshot" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_journal_history" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" ADD CONSTRAINT "FK_journal_emploiDuTempId" FOREIGN KEY ("emploiDuTempId") REFERENCES "emploi_du_temp"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" ADD CONSTRAINT "FK_journal_createdById" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" ADD CONSTRAINT "FK_journal_lastModifiedById" FOREIGN KEY ("lastModifiedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_history" ADD CONSTRAINT "FK_journal_history_journalId" FOREIGN KEY ("journalId") REFERENCES "journal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_history" ADD CONSTRAINT "FK_journal_history_performedById" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journal_history" DROP CONSTRAINT "FK_journal_history_performedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_history" DROP CONSTRAINT "FK_journal_history_journalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" DROP CONSTRAINT "FK_journal_lastModifiedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" DROP CONSTRAINT "FK_journal_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal" DROP CONSTRAINT "FK_journal_emploiDuTempId"`,
    );
    await queryRunner.query(`DROP TABLE "journal_history"`);
    await queryRunner.query(`DROP TABLE "journal"`);
  }
}
