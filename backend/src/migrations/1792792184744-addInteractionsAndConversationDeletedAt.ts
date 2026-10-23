import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInteractionsAndConversationDeletedAt1792792184744 implements MigrationInterface {
  name = 'AddInteractionsAndConversationDeletedAt1792792184744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" ADD "interactions" json`);
    await queryRunner.query(`ALTER TABLE "company_chat"."conversations" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."conversations" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" DROP COLUMN "interactions"`);
  }
}
