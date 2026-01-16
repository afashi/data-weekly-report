import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  GetReportsDto,
  ReportListResponseDto,
  ReportDetailResponseDto,
} from './dto/reports.dto';

/**
 * 周报管理 Controller
 * 提供历史周报查询、详情获取和删除功能
 */
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/reports
   * 获取历史周报列表（分页）
   *
   * @param dto 查询参数
   * @returns 周报列表
   */
  @Get()
  async getReports(@Query() dto: GetReportsDto): Promise<ReportListResponseDto> {
    this.logger.log(`收到获取周报列表请求 - 页码: ${dto.page || 1}`);

    try {
      const result = await this.reportsService.getReports(dto);
      this.logger.log(`周报列表查询成功 - 总数: ${result.total}`);
      return result;
    } catch (error) {
      this.logger.error(`周报列表查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * GET /api/reports/:id
   * 获取指定周报详情
   *
   * @param id 周报 ID
   * @returns 周报详情
   */
  @Get(':id')
  async getReportById(@Param('id') id: string): Promise<ReportDetailResponseDto> {
    this.logger.log(`收到获取周报详情请求 - ID: ${id}`);

    try {
      const result = await this.reportsService.getReportById(id);
      this.logger.log(`周报详情查询成功 - ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`周报详情查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * DELETE /api/reports/:id
   * 软删除周报
   *
   * @param id 周报 ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReport(@Param('id') id: string): Promise<void> {
    this.logger.log(`收到删除周报请求 - ID: ${id}`);

    try {
      await this.reportsService.deleteReport(id);
      this.logger.log(`周报删除成功 - ID: ${id}`);
    } catch (error) {
      this.logger.error(`周报删除失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
