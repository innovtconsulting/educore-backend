import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSubmissionDocumentNullable1781666376467 implements MigrationInterface {
  name = 'UpdateSubmissionDocumentNullable1781666376467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la contrainte de clé étrangère existante
    await queryRunner.query(
      `ALTER TABLE "submission" DROP CONSTRAINT "FK_c988039646d519e39bb3e60763b"`,
    );
    
    // Rendre documentId nullable
    await queryRunner.query(
      `ALTER TABLE "submission" ALTER COLUMN "documentId" DROP NOT NULL`,
    );
    
    // Recréer la contrainte de clé étrangère avec ON DELETE SET NULL
    await queryRunner.query(
      `ALTER TABLE "submission" ADD CONSTRAINT "FK_c988039646d519e39bb3e60763b" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revenir à l'état original
    await queryRunner.query(
      `ALTER TABLE "submission" DROP CONSTRAINT "FK_c988039646d519e39bb3e60763b"`,
    );
    
    await queryRunner.query(
      `ALTER TABLE "submission" ALTER COLUMN "documentId" SET NOT NULL`,
    );
    
    await queryRunner.query(
      `ALTER TABLE "submission" ADD CONSTRAINT "FK_c988039646d519e39bb3e60763b" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
