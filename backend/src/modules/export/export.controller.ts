import {Controller, Get, Logger, NotFoundException, Param, Res, StreamableFile,} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Response} from 'express';
import {format} from 'date-fns';
import {ExportService} from './export.service';
import {ReportEntity} from '../../entities/report.entity';

/**
 * Excel 导出 Controller
 * 提供周报导出功能
 */
@Controller()
export class ExportController {
    private readonly logger = new Logger(ExportController.name);

    constructor(
        private readonly exportService: ExportService,
        @InjectRepository(ReportEntity)
        private readonly reportRepository: Repository<ReportEntity>,
    ) {
    }

    /**
     * GET /api/reports/:id/export
     * 导出周报为 Excel 文件（符合需求规格的路径）
     *
     * @param id 周报 ID
     * @param res Express Response
     */
    @Get('reports/:id/export')
    async exportExcelNew(
        @Param('id') id: string,
        @Res({passthrough: true}) res: Response,
    ): Promise<StreamableFile> {
        return this.exportExcel(id, res);
    }

    /**
     * GET /api/export/:reportId
     * 导出周报为 Excel 文件（向后兼容的旧路径）
     *
     * @param reportId 周报 ID
     * @param res Express Response
     */
    @Get('export/:reportId')
    async exportExcel(
        @Param('reportId') reportId: string,
        @Res({passthrough: true}) res: Response,
    ): Promise<StreamableFile> {
        this.logger.log(`收到导出周报请求 - ID: ${reportId}`);

        try {
            // 1. 查询周报实体以获取元数据
            const report = await this.reportRepository.findOne({
                where: {id: reportId as any, isDeleted: false},
            });

            if (!report) {
                throw new NotFoundException(`周报不存在或已删除 - ID: ${reportId}`);
            }

            // 2. 生成 Excel 文件
            const buffer = await this.exportService.exportReport(reportId);

            // 3. 生成符合规格的文件名: 数据周报_YYYYMMDD_第N周.xlsx
            const dateStr = format(report.createdAt, 'yyyyMMdd');
            const filename = `数据周报_${dateStr}_第${report.weekNumber}周.xlsx`;

            // 4. 设置响应头（使用 encodeURIComponent 处理中文文件名）
            res.set({
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            });

            this.logger.log(`周报导出成功 - ID: ${reportId}, 文件名: ${filename}`);

            return new StreamableFile(buffer);
        } catch (error) {
      this.logger.error(`周报导出失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
