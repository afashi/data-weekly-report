import {Global, Module} from '@nestjs/common';
import {ConfigModule as NestConfigModule} from '@nestjs/config';
import {loadConfig} from './config.loader';
import {appConfigSchema} from './config.schema';

/**
 * 全局配置模块
 * 提供配置访问服务
 */
@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            load: [
                () => {
                    const config = loadConfig();

                    // Zod 校验
                    try {
                        appConfigSchema.parse(config);
                        console.log('✅ 配置文件校验通过');
                        return config;
                    } catch (error) {
                        console.error('❌ 配置文件校验失败:', error.errors);
                        throw new Error('配置文件格式不正确，请检查 config/app.yaml');
                    }
                },
            ],
        }),
    ],
    providers: [
        {
            provide: 'APP_CONFIG',
            useFactory: () => loadConfig(),
        },
    ],
    exports: ['APP_CONFIG'],
})
export class ConfigAppModule {
}
