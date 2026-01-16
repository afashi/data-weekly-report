import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../../entities/report.entity';
import { SystemMetricEntity } from '../../entities/system-metric.entity';
import { ReportItemEntity } from '../../entities/report-item.entity';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Excel 导出服务
 * 负责将周报数据导出为 Excel 文件
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    @InjectRepository(SystemMetricEntity)
    private readonly metricRepository: Repository<SystemMetricEntity>,
    @InjectRepository(ReportItemEntity)
    private readonly itemRepository: Repository<ReportItemEntity>,
    @InjectRepository(MeetingNoteEntity)
    private readonly noteRepository: Repository<MeetingNoteEntity>,
  ) {}

  /**
   * 导出周报为 Excel 文件
   * @param reportId 周报 ID
   * @returns Excel 文件 Buffer
   */
  async exportReport(reportId: string): Promise<Buffer> {
    this.logger.log(`开始导出周报 - ID: ${reportId}`);

    // 查询周报数据
    const report = await this.reportRepository.findOne({
      where: { id: reportId as any, isDeleted: false },
    });

    if (!report) {
      throw new NotFoundException(`周报不存在或已删除 - ID: ${reportId}`);
    }

    // 并行查询所有关联数据
    const [metrics, items, noteEntity] = await Promise.all([
      this.metricRepository.find({
        where: { reportId: reportId as any },
        order: { id: 'ASC' },
      }),
      this.itemRepository.find({
        where: { reportId: reportId as any },
        order: { tabType: 'ASC', sortOrder: 'ASC' },
      }),
      this.noteRepository.findOne({
        where: { reportId: reportId as any },
      }),
    ]);

    this.logger.log(
      `数据查询完成 - Metrics: ${metrics.length}, Items: ${items.length}`,
    );

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();

    // 添加概览 Sheet
    await this.addOverviewSheet(workbook, report, metrics);

    // 添加 DONE Sheet
    await this.addDoneSheet(workbook, items.filter((i) => i.tabType === 'DONE'));

    // 添加 SELF Sheet
    await this.addSelfSheet(workbook, items.filter((i) => i.tabType === 'SELF'));

    // 添加 PLAN Sheet
    await this.addPlanSheet(workbook, items.filter((i) => i.tabType === 'PLAN'));

    // 添加会议待办 Sheet
    await this.addNotesSheet(workbook, noteEntity?.content || '');

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel 导出成功 - ID: ${reportId}`);

    return Buffer.from(buffer);
  }

  /**
   * 添加概览 Sheet
   */
  private async addOverviewSheet(
    workbook: ExcelJS.Workbook,
    report: ReportEntity,
    metrics: SystemMetricEntity[],
  ) {
    const sheet = workbook.addWorksheet('概览');

    // 设置列宽
    sheet.columns = [
      { width: 20 },
      { width: 30 },
    ];

    // 添加标题
    sheet.addRow(['数据周报', '']);
    sheet.addRow(['周期', report.weekRange]);
    sheet.addRow(['周数', `第 ${report.weekNumber} 周`]);
    sheet.addRow(['生成时间', report.createdAt.toLocaleString('zh-CN')]);
    sheet.addRow([]);

    // 添加指标数据
    sheet.addRow(['指标名称', '指标值']);
    metrics.forEach((metric) => {
      const label = this.getMetricLabel(metric.metricKey);
      sheet.addRow([label, metric.metricValue]);
    });

    // 设置样式
    sheet.getRow(1).font = { bold: true, size: 16 };
    sheet.getRow(6).font = { bold: true };
    sheet.getRow(6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };
  }

  /**
   * 添加 DONE Sheet
   */
  private async addDoneSheet(
    workbook: ExcelJS.Workbook,
    items: ReportItemEntity[],
  ) {
    const sheet = workbook.addWorksheet('本周完成');

    // 设置列
    sheet.columns = [
      { header: 'Jira号', key: 'jiraKey', width: 15 },
      { header: '任务名称', key: 'title', width: 40 },
      { header: '状态', key: 'status', width: 12 },
      { header: '负责人', key: 'assignee', width: 12 },
      { header: '开发环境', key: 'devStatus', width: 12 },
      { header: '测试环境', key: 'testStatus', width: 12 },
      { header: '验证环境', key: 'verifyStatus', width: 12 },
      { header: '复盘环境', key: 'reviewStatus', width: 12 },
      { header: '生产环境', key: 'prodStatus', width: 12 },
    ];

    // 添加数据
    items.forEach((item) => {
      const content = JSON.parse(item.contentJson);
      sheet.addRow({
        jiraKey: content.jiraKey || '',
        title: content.title || '',
        status: content.status || '',
        assignee: content.assignee || '',
        devStatus: content.devStatus || '',
        testStatus: content.testStatus || '',
        verifyStatus: content.verifyStatus || '',
        reviewStatus: content.reviewStatus || '',
        prodStatus: content.prodStatus || '',
      });
    });

    // 设置表头样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };
  }

  /**
   * 添加 SELF Sheet（树形结构）
   */
  private async addSelfSheet(
    workbook: ExcelJS.Workbook,
    items: ReportItemEntity[],
  ) {
    const sheet = workbook.addWorksheet('自采数据');

    // 设置列
    sheet.columns = [
      { header: '任务名称', key: 'title', width: 50 },
      { header: '负责人', key: 'assignee', width: 12 },
      { header: '工期（天）', key: 'workDays', width: 12 },
    ];

    // 构建树形结构并添加数据
    const rootItems = items.filter((item) => !item.parentId);
    rootItems.forEach((rootItem) => {
      const rootContent = JSON.parse(rootItem.contentJson);
      sheet.addRow({
        title: rootContent.title || '',
        assignee: rootContent.assignee || '',
        workDays: rootContent.workDays || '',
      });

      // 添加子任务（缩进）
      const children = items.filter((item) => item.parentId === rootItem.id);
      children.forEach((child) => {
        const childContent = JSON.parse(child.contentJson);
        sheet.addRow({
          title: `  └─ ${childContent.title || ''}`,
          assignee: childContent.assignee || '',
          workDays: childContent.workDays || '',
        });
      });
    });

    // 设置表头样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };
  }

  /**
   * 添加 PLAN Sheet
   */
  private async addPlanSheet(
    workbook: ExcelJS.Workbook,
    items: ReportItemEntity[],
  ) {
    const sheet = workbook.addWorksheet('后续计划');

    // 设置列
    sheet.columns = [
      { header: 'Jira号', key: 'jiraKey', width: 15 },
      { header: '任务名称', key: 'title', width: 40 },
      { header: '状态', key: 'status', width: 12 },
      { header: '负责人', key: 'assignee', width: 12 },
      { header: '预计工期', key: 'workDays', width: 12 },
    ];

    // 添加数据
    items.forEach((item) => {
      const content = JSON.parse(item.contentJson);
      sheet.addRow({
        jiraKey: content.jiraKey || '',
        title: content.title || '',
        status: content.status || '',
        assignee: content.assignee || '',
        workDays: content.workDays || '',
      });
    });

    // 设置表头样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };
  }

  /**
   * 添加会议待办 Sheet
   */
  private async addNotesSheet(workbook: ExcelJS.Workbook, notes: string) {
    const sheet = workbook.addWorksheet('会议待办');

    // 设置列宽
    sheet.columns = [{ width: 80 }];

    // 添加标题
    sheet.addRow(['会议待办事项']);
    sheet.addRow([]);

    // 添加内容（按行分割）
    const lines = notes.split('\n');
    lines.forEach((line) => {
      sheet.addRow([line]);
    });

    // 设置标题样式
    sheet.getRow(1).font = { bold: true, size: 14 };
  }

  /**
   * 获取指标标签
   */
  private getMetricLabel(key: string): string {
    const labels: Record<string, string> = {
      TOTAL_COUNT: '总计',
      PROCESS_COUNT: '流程数据',
      MANUAL_COUNT: '自采数据',
      VERIFY_ETL: '验证环境 ETL',
      REVIEW_ETL: '复盘环境 ETL',
    };
    return labels[key] || key;
  }
}
