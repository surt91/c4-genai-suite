import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records the conversation of generated images (`llm_image` blobs), the user is stored in the existing `userId`. Images
 * generated before this migration keep `userId` and `conversationId` empty: their owner is unknown, so they are neither
 * deleted with a conversation or user nor restricted to an owner (all logged in users can still read them by ID).
 */
export class AddBlobOwnerOfGeneratedImages1792835550174 implements MigrationInterface {
  name = 'AddBlobOwnerOfGeneratedImages1792835550174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."blobs" ADD "conversationId" integer`);
    await queryRunner.query(`CREATE INDEX "IDX_950d70d0a8e54bb1049da34987" ON "company_chat"."blobs"  ("conversationId") `);
    await queryRunner.query(
      `ALTER TABLE "company_chat"."blobs" ADD CONSTRAINT "FK_950d70d0a8e54bb1049da34987c" FOREIGN KEY ("conversationId") REFERENCES "company_chat"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."blobs" DROP CONSTRAINT "FK_950d70d0a8e54bb1049da34987c"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_950d70d0a8e54bb1049da34987"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."blobs" DROP COLUMN "conversationId"`);
  }
}
