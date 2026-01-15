import {Body, Controller, Get, HttpCode, HttpStatus, Logger, Post} from '@nestjs/common';
import {GenerateService} from './generate.service';
import {GenerateReportDto, ReportResponseDto} from './dto/generate.dto';

/**
 * 周报生成 Controller
 * 提供 REST API 端点
 */
@Controller('api/generate')
export class GenerateController {
    private readonly logger = new Logger(GenerateController.name);

    constructor(private readonly generateService: GenerateService) {
    }

    /**
     * POST /api/generate
     * 生成新周报
     *
     * @param dto 生成参数（可选）
     * @returns 生成的周报数据
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async generateReport(@Body() dto: GenerateReportDto = {}): Promise<ReportResponseDto> {
        this.logger.log('收到生成周报请求');

        try {
            const result = await this.generateService.generateReport(dto);
            this.logger.log(`周报生成成功 - Report ID: ${result.id}`);
            return result;
        } catch (error) {
            this.logger.error(`周报生成失败: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * GET /api/generate/health
     * 健康检查 - 验证所有依赖服务状态
     *
     * @returns 健康状态
     */
    @Get('health')
    async healthCheck(): Promise<{
        status: 'ok' | 'error';
        timestamp: string;
        services: {
            jira: boolean;
            sql: Record<string, boolean>;
            database: boolean;
        };
    }> {
        this.logger.log('收到健康检查请求');

        const health = await this.generateService.healthCheck();

        const allOk = health.jira && health.database && Array.from(health.sql.values()).every((v) => v);

        return {
            status: allOk ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            services: {
                jira: health.jira,
                sql: Object.fromEntries(health.sql),
                database: health.database,
            },
        };
    }
}
