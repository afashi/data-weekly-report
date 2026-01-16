import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

/**
 * Excel 导出 Controller
 * 提供周报导出功能
 */
@Controller('export')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /api/export/:reportId
   * 导出周报为 Excel 文件
   *
   * @param reportId 周报 ID
   * @param res Express Response
   */
  @Get(':reportId')
  async exportReport(
    @Param('reportId') reportId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(`收到导出周报请求 - ID: ${reportId}`);

    try {
      const buffer = await this.exportService.exportReport(reportId);

      // 设置响应头
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="weekly-report-${reportId}.xlsx"`,
      });

      this.logger.log(`周报导出成功 - ID: ${reportId}`);

      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.error(`周报导出失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
