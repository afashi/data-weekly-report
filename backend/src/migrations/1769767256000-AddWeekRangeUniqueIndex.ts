import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddWeekRangeUniqueIndex implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 添加week_range唯一索引
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_reports_week_range_unique
            ON reports(week_range)
            WHERE is_deleted = 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 删除唯一索引
        await queryRunner.query(`
            DROP INDEX idx_reports_week_range_unique
        `);
    }
}
