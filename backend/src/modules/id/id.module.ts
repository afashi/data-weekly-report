import {Global, Module} from '@nestjs/common';
import {IdService} from './id.service';

/**
 * 全局 ID 生成模块
 * 提供 Snowflake ID 生成服务
 */
@Global()
@Module({
    providers: [IdService],
    exports: [IdService],
})
export class IdModule {
}
