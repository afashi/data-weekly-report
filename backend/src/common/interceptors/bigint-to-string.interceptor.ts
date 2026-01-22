import {CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {instanceToPlain} from 'class-transformer';

/**
 * BIGINT 序列化拦截器
 * 全局拦截所有响应，确保 BIGINT 类型的 ID 转为 String
 *
 * 应用场景：
 * - 防止 JavaScript Number 类型对 64 位整数的精度丢失
 * - 确保前端接收到的 ID 为字符串格式
 */
@Injectable()
export class BigIntToStringInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                // 跳过 StreamableFile 类型（文件流不需要序列化）
                if (data instanceof StreamableFile) {
                    return data;
                }

                // 使用 class-transformer 自动触发 @Transform 装饰器
                return instanceToPlain(data, {
                    exposeUnsetFields: false,
                    excludeExtraneousValues: false,
                });
            }),
        );
    }
}
