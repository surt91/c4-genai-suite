import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageStopped1792786111275 implements MigrationInterface {
  name = 'AddMessageStopped1792786111275';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" ADD "stopped" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" DROP COLUMN "stopped"`);
  }
}
