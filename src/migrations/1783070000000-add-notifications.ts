import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1783070000000 implements MigrationInterface {
  name = 'AddNotifications1783070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasNotificationTable = await queryRunner.hasTable('notification');
    if (hasNotificationTable) return;

    await queryRunner.query(
      `CREATE TABLE "notification" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "type" character varying NOT NULL DEFAULT 'ECOLAGE_RETARD', "isRead" boolean NOT NULL DEFAULT false, "dedupeKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "recipientId" integer NOT NULL, "factureId" integer, CONSTRAINT "UQ_notification_dedupeKey" UNIQUE ("dedupeKey"), CONSTRAINT "PK_notification_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_recipient" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_facture" FOREIGN KEY ("factureId") REFERENCES "facture"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNotificationTable = await queryRunner.hasTable('notification');
    if (!hasNotificationTable) return;

    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_facture"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_recipient"`,
    );
    await queryRunner.query(`DROP TABLE "notification"`);
  }
}
