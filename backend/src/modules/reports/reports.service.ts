import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../../entities/report.entity';
import { SystemMetricEntity } from '../../entities/system-metric.entity';
import { ReportItemEntity } from '../../entities/report-item.entity';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';
import {
  GetReportsDto,
  ReportListResponseDto,
  ReportDetailResponseDto,
  ReportListItemDto,
} from './dto/reports.dto';

/**
 * 周报管理服务
 * 负责历史周报的查询、详情获取和软删除
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

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
   * 获取历史周报列表（分页）
   * @param dto 查询参数
   * @returns 周报列表
   */
  async getReports(dto: GetReportsDto): Promise<ReportListResponseDto> {
    const { page = 1, pageSize = 20 } = dto;
    const skip = (page - 1) * pageSize;

    this.logger.log(`查询周报列表 - 页码: ${page}, 每页: ${pageSize}`);

    // 查询未删除的周报，按创建时间倒序
    const [reports, total] = await this.reportRepository.findAndCount({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    const items: ReportListItemDto[] = reports.map((report) => ({
      id: report.id.toString(),
      weekRange: report.weekRange,
      weekNumber: report.weekNumber,
      createdAt: report.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / pageSize);

    this.logger.log(`查询完成 - 总数: ${total}, 当前页: ${items.length} 条`);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 获取指定周报详情（包含所有关联数据）
   * @param id 周报 ID
   * @returns 周报详情
   */
  async getReportById(id: string): Promise<ReportDetailResponseDto> {
    this.logger.log(`查询周报详情 - ID: ${id}`);

    // 查询主报告
    const report = await this.reportRepository.findOne({
      where: { id: id as any, isDeleted: false },
    });

    if (!report) {
      throw new NotFoundException(`周报不存在或已删除 - ID: ${id}`);
    }

    // 并行查询所有关联数据
    const [metrics, items, noteEntity] = await Promise.all([
      this.metricRepository.find({
        where: { reportId: id as any },
        order: { id: 'ASC' },
      }),
      this.itemRepository.find({
        where: { reportId: id as any },
        order: { tabType: 'ASC', sortOrder: 'ASC' },
      }),
      this.noteRepository.findOne({
        where: { reportId: id as any },
      }),
    ]);

    this.logger.log(
      `查询完成 - Metrics: ${metrics.length}, Items: ${items.length}, Notes: ${noteEntity ? '有' : '无'}`,
    );

    // 组装响应数据
    return {
      id: report.id.toString(),
      weekRange: report.weekRange,
      weekNumber: report.weekNumber,
      createdAt: report.createdAt.toISOString(),
      metrics: metrics.map((m) => ({
        id: m.id.toString(),
        metricKey: m.metricKey,
        metricValue: m.metricValue,
        statusCode: m.statusCode,
      })),
      items: items.map((item) => ({
        id: item.id.toString(),
        tabType: item.tabType,
        sourceType: item.sourceType,
        parentId: item.parentId ? item.parentId.toString() : null,
        contentJson: JSON.parse(item.contentJson),
        sortOrder: item.sortOrder,
      })),
      notes: noteEntity?.content || '',
    };
  }

  /**
   * 软删除周报
   * @param id 周报 ID
   */
  async deleteReport(id: string): Promise<void> {
    this.logger.log(`软删除周报 - ID: ${id}`);

    const report = await this.reportRepository.findOne({
      where: { id: id as any, isDeleted: false },
    });

    if (!report) {
      throw new NotFoundException(`周报不存在或已删除 - ID: ${id}`);
    }

    // 执行软删除
    report.isDeleted = true;
    await this.reportRepository.save(report);

    this.logger.log(`软删除成功 - ID: ${id}`);
  }
}
