import {NestFactory, Reflector} from '@nestjs/core';
import {ClassSerializerInterceptor, ValidationPipe} from '@nestjs/common';
import {AppModule} from './app.module';
import {BigIntToStringInterceptor} from './common/interceptors/bigint-to-string.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 获取配置服务
    const appConfig = app.get('APP_CONFIG');

    // 全局启用验证管道
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // 自动过滤未定义的属性
            forbidNonWhitelisted: true, // 拒绝包含未定义属性的请求
            transform: true, // 自动类型转换
            transformOptions: {
                enableImplicitConversion: true, // 隐式类型转换
            },
        }),
    );

    // 全局启用 BIGINT 序列化拦截器
    app.useGlobalInterceptors(new BigIntToStringInterceptor());

    // 全局启用 class-transformer 序列化拦截器
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    // 启用 CORS（允许前端跨域请求）
    app.enableCors({
        origin: appConfig.server.corsOrigin,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // 设置全局路由前缀
    app.setGlobalPrefix('api');

    const port = appConfig.server.port;
    await app.listen(port);

    console.log(`🚀 应用已启动：http://localhost:${port}`);
    console.log(`📡 API 端点：http://localhost:${port}/api`);
    console.log(`📊 健康检查：http://localhost:${port}/api/generate/health`);
}

bootstrap();
