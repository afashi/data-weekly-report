/**
 * 性能测试脚本
 * 测试周报生成、Excel 导出和 API 响应性能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api';

// 颜色输出
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPerformance() {
    console.log('\n' + '='.repeat(60));
    log('blue', '📊 数据周报系统 - 性能测试');
    console.log('='.repeat(60) + '\n');

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
    };

    // 测试 1: 健康检查
    try {
        log('yellow', '🔍 测试 1: 健康检查 API');
        const startTime = Date.now();
        const response = await axios.get(`${API_BASE_URL}/generate/health`, {
            timeout: 5000,
        });
        const duration = Date.now() - startTime;

        if (duration < 1000) {
            log('green', `  ✅ 通过 - 响应时间: ${duration}ms`);
            results.passed++;
        } else {
            log('red', `  ❌ 失败 - 响应时间过长: ${duration}ms (期望 < 1000ms)`);
            results.failed++;
        }
        results.tests.push({name: '健康检查', duration, passed: duration < 1000});
    } catch (error) {
        log('red', `  ❌ 失败 - ${error.message}`);
        results.failed++;
        results.tests.push({name: '健康检查', duration: 0, passed: false, error: error.message});
    }

    // 测试 2: 周报生成性能
    try {
        log('yellow', '\n🔍 测试 2: 周报生成性能');
        const weekRange = `2026/02/${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}-2026/02/${String(Math.floor(Math.random() * 20) + 8).padStart(2, '0')}`;

        const startTime = Date.now();
        const response = await axios.post(
            `${API_BASE_URL}/generate`,
            {weekRange},
            {timeout: 30000},
        );
        const duration = Date.now() - startTime;

        if (duration < 5000 && response.status === 201) {
            log('green', `  ✅ 通过 - 生成时间: ${duration}ms`);
            log('blue', `  📝 周报 ID: ${response.data.id}`);
            results.passed++;
            results.reportId = response.data.id;
        } else if (duration >= 5000) {
            log('red', `  ❌ 失败 - 生成时间过长: ${duration}ms (期望 < 5000ms)`);
            results.failed++;
        } else {
            log('red', `  ❌ 失败 - 状态码: ${response.status}`);
            results.failed++;
        }
        results.tests.push({name: '周报生成', duration, passed: duration < 5000 && response.status === 201});
    } catch (error) {
        if (error.response && error.response.status === 409) {
            log('yellow', `  ⚠️  周报已存在 (409) - 这是正常的`);
            results.passed++;
            results.tests.push({name: '周报生成', duration: 0, passed: true, note: '周报已存在'});
        } else {
            log('red', `  ❌ 失败 - ${error.message}`);
            results.failed++;
            results.tests.push({name: '周报生成', duration: 0, passed: false, error: error.message});
        }
    }

    // 测试 3: 周报查询性能
    try {
        log('yellow', '\n🔍 测试 3: 周报查询性能');
        const startTime = Date.now();
        const response = await axios.get(`${API_BASE_URL}/reports`, {
            timeout: 5000,
        });
        const duration = Date.now() - startTime;

        if (duration < 1000 && response.status === 200) {
            log('green', `  ✅ 通过 - 查询时间: ${duration}ms`);
            log('blue', `  📊 周报数量: ${response.data.length}`);
            results.passed++;
        } else if (duration >= 1000) {
            log('red', `  ❌ 失败 - 查询时间过长: ${duration}ms (期望 < 1000ms)`);
            results.failed++;
        } else {
            log('red', `  ❌ 失败 - 状态码: ${response.status}`);
            results.failed++;
        }
        results.tests.push({name: '周报查询', duration, passed: duration < 1000 && response.status === 200});
    } catch (error) {
        log('red', `  ❌ 失败 - ${error.message}`);
        results.failed++;
        results.tests.push({name: '周报查询', duration: 0, passed: false, error: error.message});
    }

    // 测试 4: Excel 导出性能（如果有周报 ID）
    if (results.reportId) {
        try {
            log('yellow', '\n🔍 测试 4: Excel 导出性能');
            const startTime = Date.now();
            const response = await axios.get(`${API_BASE_URL}/reports/${results.reportId}/export`, {
                timeout: 30000,
                responseType: 'arraybuffer',
            });
            const duration = Date.now() - startTime;

            if (duration < 10000 && response.status === 200) {
                log('green', `  ✅ 通过 - 导出时间: ${duration}ms`);
                log('blue', `  📄 文件大小: ${(response.data.byteLength / 1024).toFixed(2)} KB`);
                results.passed++;
            } else if (duration >= 10000) {
                log('red', `  ❌ 失败 - 导出时间过长: ${duration}ms (期望 < 10000ms)`);
                results.failed++;
            } else {
                log('red', `  ❌ 失败 - 状态码: ${response.status}`);
                results.failed++;
            }
            results.tests.push({name: 'Excel 导出', duration, passed: duration < 10000 && response.status === 200});
        } catch (error) {
            log('red', `  ❌ 失败 - ${error.message}`);
            results.failed++;
            results.tests.push({name: 'Excel 导出', duration: 0, passed: false, error: error.message});
        }
    }

    // 输出总结
    console.log('\n' + '='.repeat(60));
    log('blue', '📈 性能测试总结');
    console.log('='.repeat(60));
    console.log(`总测试数: ${results.passed + results.failed}`);
    log('green', `通过: ${results.passed}`);
    log('red', `失败: ${results.failed}`);
    console.log('='.repeat(60) + '\n');

    // 详细结果
    console.log('详细结果:');
    results.tests.forEach((test, index) => {
        const status = test.passed ? '✅' : '❌';
        const duration = test.duration ? `${test.duration}ms` : 'N/A';
        console.log(`  ${index + 1}. ${status} ${test.name} - ${duration}`);
        if (test.note) {
            console.log(`     ℹ️  ${test.note}`);
        }
        if (test.error) {
            console.log(`     ❌ ${test.error}`);
        }
    });

    console.log('');

    // 退出码
    process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
testPerformance().catch((error) => {
    console.error('性能测试失败:', error);
    process.exit(1);
});
