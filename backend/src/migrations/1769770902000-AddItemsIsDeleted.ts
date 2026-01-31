import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddItemsIsDeleted implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 添加is_deleted字段
        await queryRunner.query(`
            ALTER TABLE report_items ADD COLUMN is_deleted BOOLEAN DEFAULT 0
        `);

        // 添加复合索引
        await queryRunner.query(`
            CREATE INDEX idx_report_items_report_tab_deleted
            ON report_items(report_id, tab_type, is_deleted)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 删除索引
        await queryRunner.query(`
            DROP INDEX idx_report_items_report_tab_deleted
        `);

        // 删除字段（SQLite不支持DROP COLUMN，需要重建表）
        // 这里简化处理，实际生产环境需要完整的表重建逻辑
    }
}
