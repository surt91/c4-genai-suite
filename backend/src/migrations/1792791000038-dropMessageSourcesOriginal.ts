import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropMessageSourcesOriginal1792791000038 implements MigrationInterface {
  name = 'DropMessageSourcesOriginal1792791000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" DROP COLUMN "sourcesOriginal"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" ADD "sourcesOriginal" json`);
    // the backup is gone; keep the current sources so that reverting MigrateSourcesToNewFormat does not clear them
    await queryRunner.query(`UPDATE "company_chat"."messages" SET "sourcesOriginal" = "sources"`);
  }
}
