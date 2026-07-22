import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnnonceJournal1784710021383 implements MigrationInterface {
    name = 'AddAnnonceJournal1784710021383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "annonce" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "targetAudiences" text NOT NULL DEFAULT '["Tous"]', "createdById" integer NOT NULL, "etablissementId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_17877abe3820cc4790f32b58c63" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "journal" ("id" SERIAL NOT NULL, "emploiDuTempId" integer NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "objectives" text, "homework" text, "remarks" text, "createdById" integer NOT NULL, "createdByName" character varying NOT NULL, "createdByRole" character varying NOT NULL, "lastModifiedById" integer NOT NULL, "lastModifiedByName" character varying NOT NULL, "lastModifiedByRole" character varying NOT NULL, "etablissementId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d51e8d394b2df7f1f8495f82e81" UNIQUE ("emploiDuTempId"), CONSTRAINT "REL_d51e8d394b2df7f1f8495f82e8" UNIQUE ("emploiDuTempId"), CONSTRAINT "PK_396f862c229742e29f888b1abce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "journal_history" ("id" SERIAL NOT NULL, "journalId" integer NOT NULL, "action" character varying NOT NULL, "performedById" integer NOT NULL, "performedByName" character varying NOT NULL, "performedByRole" character varying NOT NULL, "snapshot" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0e742eb3151297c2e543f4e8cbd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "annonce" ADD CONSTRAINT "FK_98b3c4cf154ebb4e0fe073e7364" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annonce" ADD CONSTRAINT "FK_320efe7e552b013e8a03e5c10ab" FOREIGN KEY ("etablissementId") REFERENCES "etablissement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "journal" ADD CONSTRAINT "FK_d51e8d394b2df7f1f8495f82e81" FOREIGN KEY ("emploiDuTempId") REFERENCES "emploi_du_temp"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "journal" ADD CONSTRAINT "FK_0b7a2fa22b886aac77f2c3894ae" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "journal" ADD CONSTRAINT "FK_0095d795195e67ea5cae5a9eb44" FOREIGN KEY ("lastModifiedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "journal_history" ADD CONSTRAINT "FK_23b8e5fa38b9405e2cf490a062d" FOREIGN KEY ("journalId") REFERENCES "journal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "journal_history" ADD CONSTRAINT "FK_2fe7c0341794e7bab29df8bef7b" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "journal_history" DROP CONSTRAINT "FK_2fe7c0341794e7bab29df8bef7b"`);
        await queryRunner.query(`ALTER TABLE "journal_history" DROP CONSTRAINT "FK_23b8e5fa38b9405e2cf490a062d"`);
        await queryRunner.query(`ALTER TABLE "journal" DROP CONSTRAINT "FK_0095d795195e67ea5cae5a9eb44"`);
        await queryRunner.query(`ALTER TABLE "journal" DROP CONSTRAINT "FK_0b7a2fa22b886aac77f2c3894ae"`);
        await queryRunner.query(`ALTER TABLE "journal" DROP CONSTRAINT "FK_d51e8d394b2df7f1f8495f82e81"`);
        await queryRunner.query(`ALTER TABLE "annonce" DROP CONSTRAINT "FK_320efe7e552b013e8a03e5c10ab"`);
        await queryRunner.query(`ALTER TABLE "annonce" DROP CONSTRAINT "FK_98b3c4cf154ebb4e0fe073e7364"`);
        await queryRunner.query(`DROP TABLE "journal_history"`);
        await queryRunner.query(`DROP TABLE "journal"`);
        await queryRunner.query(`DROP TABLE "annonce"`);
    }

}
