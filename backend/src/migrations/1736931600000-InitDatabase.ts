import {MigrationInterface, QueryRunner} from 'typeorm';

/**
 * 初始化数据库结构
 * 创建 4 张表：reports, system_metrics, report_items, meeting_notes
 */
export class InitDatabase1736931600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建 reports 表
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

    // 2. 创建 system_metrics 表
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

    // 3. 创建 report_items 表
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

    // 4. 创建 meeting_notes 表
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meeting_notes_report_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS meeting_notes`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_parent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_report_items_report_tab`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_items`);

    await queryRunner.query(`DROP INDEX IF EXISTS uniq_system_metrics_report_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_system_metrics_report_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_metrics`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_is_deleted_created_at`);
    await queryRunner.query(`DROP TABLE IF EXISTS reports`);
  }
}
