import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * 修复 BIGINT 精度丢失问题
 *
 * 问题描述:
 * - SQLite 的 INTEGER 类型会导致 JavaScript Number 精度丢失
 * - Snowflake ID (64位) 超过 JavaScript 安全整数范围 (53位)
 * - 需要将所有 ID 字段改为 TEXT 类型存储字符串
 *
 * 修复方案:
 * 1. 备份现有数据
 * 2. 删除所有表
 * 3. 重新创建表,ID 字段使用 TEXT 类型
 * 4. 恢复数据(如果需要)
 */
export class FixBigintPrecisionLoss1739095000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('⚠️  开始修复 BIGINT 精度丢失问题...');

        // 1. 删除所有索引
        await queryRunner.query(`DROP INDEX IF EXISTS idx_meeting_notes_report_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_sort`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_parent`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_report_tab`);
        await queryRunner.query(`DROP INDEX IF EXISTS uniq_system_metrics_report_key`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_system_metrics_report_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_is_deleted_created_at`);

        // 2. 删除所有表
        await queryRunner.query(`DROP TABLE IF EXISTS meeting_notes`);
        await queryRunner.query(`DROP TABLE IF EXISTS report_items`);
        await queryRunner.query(`DROP TABLE IF EXISTS system_metrics`);
        await queryRunner.query(`DROP TABLE IF EXISTS reports`);

        console.log('✅ 已删除旧表结构');

        // 3. 重新创建 reports 表 (ID 使用 TEXT 类型)
        await queryRunner.query(`
      CREATE TABLE reports (
        id TEXT PRIMARY KEY,
        week_range VARCHAR(32) NOT NULL,
        week_number INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT 0
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_reports_is_deleted_created_at
      ON reports(is_deleted, created_at DESC)
    `);

        // 4. 重新创建 system_metrics 表 (ID 和 report_id 使用 TEXT 类型)
        await queryRunner.query(`
      CREATE TABLE system_metrics (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        metric_key VARCHAR(64) NOT NULL,
        metric_value VARCHAR(128) NOT NULL,
        status_code VARCHAR(32) NOT NULL,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_system_metrics_report_id
      ON system_metrics(report_id)
    `);

        await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_system_metrics_report_key
      ON system_metrics(report_id, metric_key)
    `);

        // 5. 重新创建 report_items 表 (ID、report_id 和 parent_id 使用 TEXT 类型)
        await queryRunner.query(`
      CREATE TABLE report_items (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        tab_type VARCHAR(16) NOT NULL,
        source_type VARCHAR(16) NOT NULL,
        parent_id TEXT,
        content_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES report_items(id) ON DELETE CASCADE
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_report_tab
      ON report_items(report_id, tab_type)
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_parent
      ON report_items(parent_id)
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_sort
      ON report_items(report_id, tab_type, sort_order)
    `);

        // 6. 重新创建 meeting_notes 表 (ID 和 report_id 使用 TEXT 类型)
        await queryRunner.query(`
      CREATE TABLE meeting_notes (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_meeting_notes_report_id
      ON meeting_notes(report_id)
    `);

        console.log('✅ 已重新创建表结构 (ID 字段使用 TEXT 类型)');
        console.log('⚠️  注意: 所有旧数据已被清空,请重新生成周报');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚到原始的 INTEGER 类型结构
        console.log('⚠️  回滚到 INTEGER 类型结构...');

        // 删除所有索引
        await queryRunner.query(`DROP INDEX IF EXISTS idx_meeting_notes_report_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_sort`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_parent`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_report_tab`);
        await queryRunner.query(`DROP INDEX IF EXISTS uniq_system_metrics_report_key`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_system_metrics_report_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_is_deleted_created_at`);

        // 删除所有表
        await queryRunner.query(`DROP TABLE IF EXISTS meeting_notes`);
        await queryRunner.query(`DROP TABLE IF EXISTS report_items`);
        await queryRunner.query(`DROP TABLE IF EXISTS system_metrics`);
        await queryRunner.query(`DROP TABLE IF EXISTS reports`);

        // 重新创建原始结构 (INTEGER 类型)
        await queryRunner.query(`
      CREATE TABLE reports (
        id INTEGER PRIMARY KEY,
        week_range VARCHAR(32) NOT NULL,
        week_number INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT 0
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_reports_is_deleted_created_at
      ON reports(is_deleted, created_at DESC)
    `);

        await queryRunner.query(`
      CREATE TABLE system_metrics (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        metric_key VARCHAR(64) NOT NULL,
        metric_value VARCHAR(128) NOT NULL,
        status_code VARCHAR(32) NOT NULL
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_system_metrics_report_id
      ON system_metrics(report_id)
    `);

        await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_system_metrics_report_key
      ON system_metrics(report_id, metric_key)
    `);

        await queryRunner.query(`
      CREATE TABLE report_items (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        tab_type VARCHAR(16) NOT NULL,
        source_type VARCHAR(16) NOT NULL,
        parent_id INTEGER,
        content_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_report_tab
      ON report_items(report_id, tab_type)
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_parent
      ON report_items(parent_id)
    `);

        await queryRunner.query(`
      CREATE INDEX idx_report_items_sort
      ON report_items(report_id, tab_type, sort_order)
    `);

        await queryRunner.query(`
      CREATE TABLE meeting_notes (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        content TEXT NOT NULL
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_meeting_notes_report_id
      ON meeting_notes(report_id)
    `);

        console.log('✅ 已回滚到 INTEGER 类型结构');
    }
}
