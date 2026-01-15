import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {AppConfig} from './config.types';

/**
 * 加载 YAML 配置文件
 * 优先级：环境变量 > app.yaml > app.yaml.example
 */
export function loadConfig(): AppConfig {
    const configPath = process.env.CONFIG_PATH || 'config/app.yaml';
    const examplePath = 'config/app.yaml.example';

    let filePath = configPath;

    // 如果配置文件不存在，尝试使用示例文件
    if (!fs.existsSync(configPath)) {
        console.warn(`⚠️  配置文件 ${configPath} 不存在，使用示例配置 ${examplePath}`);
        filePath = examplePath;
    }

    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const config = yaml.load(fileContents) as AppConfig;

        // 环境变量覆盖（可选）
        if (process.env.SERVER_PORT) {
            config.server.port = parseInt(process.env.SERVER_PORT, 10);
        }

        if (process.env.DATABASE_PATH) {
            config.database.path = process.env.DATABASE_PATH;
        }

        return config;
    } catch (error) {
        throw new Error(`❌ 配置文件加载失败: ${error.message}`);
    }
}
