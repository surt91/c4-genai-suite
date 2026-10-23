import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExecutor1792788223160 implements MigrationInterface {
  name = 'RemoveExecutor1792788223160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" DROP COLUMN "executorEndpoint"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" DROP COLUMN "executorHeaders"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ADD "executorHeaders" text`);
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ADD "executorEndpoint" text`);
  }
}
