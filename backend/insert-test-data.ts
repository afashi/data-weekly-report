import {DataSource} from 'typeorm';
import {ReportEntity} from './src/entities/report.entity';
import {SystemMetricEntity} from './src/entities/system-metric.entity';
import {ReportItemEntity} from './src/entities/report-item.entity';
import {MeetingNoteEntity} from './src/entities/meeting-note.entity';

async function insertTestData() {
    const dataSource = new DataSource({
        type: 'sqlite',
        database: 'data/weekly-report.sqlite',
        entities: [ReportEntity, SystemMetricEntity, ReportItemEntity, MeetingNoteEntity],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('数据库连接成功');

    const reportId = '272641109195260928';

    // 1. 插入周报
    const report = new ReportEntity();
    report.id = reportId;
    report.weekRange = '2026/01/19-2026/01/25';
    report.weekNumber = 4;
    report.createdAt = new Date();
    report.isDeleted = false;
    await dataSource.manager.save(report);
    console.log('✅ 周报插入成功');

    // 2. 插入系统指标
    const metrics = [
        {id: '272641109195260929', metricKey: 'TOTAL_COUNT', metricValue: '150', statusCode: 'success'},
        {id: '272641109195260930', metricKey: 'PROCESS_COUNT', metricValue: '100', statusCode: 'success'},
        {id: '272641109195260931', metricKey: 'MANUAL_COUNT', metricValue: '50', statusCode: 'success'},
        {id: '272641109195260932', metricKey: 'VERIFY_ETL', metricValue: '2026-01-22 10:30:00', statusCode: 'success'},
        {id: '272641109195260933', metricKey: 'REVIEW_ETL', metricValue: '2026-01-22 11:00:00', statusCode: 'success'},
    ];

    for (const m of metrics) {
        const metric = new SystemMetricEntity();
        metric.id = m.id;
        metric.reportId = reportId;
        metric.metricKey = m.metricKey;
        metric.metricValue = m.metricValue;
        metric.statusCode = m.statusCode;
        await dataSource.manager.save(metric);
    }
    console.log('✅ 系统指标插入成功');

    // 3. 插入 DONE 标签页数据
    const doneItems = [
        {
            id: '272641109195260934',
            content: {
                jiraKey: 'DATADEV-101',
                title: '用户登录功能开发',
                status: 'Done',
                assignee: '张三',
                devStatus: '已完成',
                testStatus: '已完成',
                verifyStatus: '已完成',
                reviewStatus: '已完成',
                prodStatus: '已上线'
            },
            sortOrder: 1
        },
        {
            id: '272641109195260935',
            content: {
                jiraKey: 'DATADEV-102',
                title: '数据报表优化',
                status: 'Done',
                assignee: '李四',
                devStatus: '已完成',
                testStatus: '已完成',
                verifyStatus: '已完成',
                reviewStatus: '进行中',
                prodStatus: '未上线'
            },
            sortOrder: 2
        },
        {
            id: '272641109195260936',
            content: {
                jiraKey: 'DATADEV-103',
                title: 'ETL 任务调度优化',
                status: 'Done',
                assignee: '王五',
                devStatus: '已完成',
                testStatus: '已完成',
                verifyStatus: '进行中',
                reviewStatus: '未开始',
                prodStatus: '未上线'
            },
            sortOrder: 3
        },
    ];

    for (const d of doneItems) {
        const item = new ReportItemEntity();
        item.id = d.id;
        item.reportId = reportId;
        item.tabType = 'DONE';
        item.sourceType = 'JIRA';
        item.parentId = null;
        item.contentJson = JSON.stringify(d.content);
        item.sortOrder = d.sortOrder;
        await dataSource.manager.save(item);
    }
    console.log('✅ DONE 标签页数据插入成功');

    // 4. 插入 SELF 标签页数据（树形结构）
    const selfItems = [
        // 主任务 1
        {
            id: '272641109195260937',
            parentId: null,
            content: {title: '数据仓库架构升级', assignee: '赵六', workDays: '10'},
            sortOrder: 1
        },
        {
            id: '272641109195260938',
            parentId: '272641109195260937',
            content: {title: '数据模型设计', assignee: '赵六', workDays: '3'},
            sortOrder: 2
        },
        {
            id: '272641109195260939',
            parentId: '272641109195260937',
            content: {title: 'ETL 流程重构', assignee: '钱七', workDays: '5'},
            sortOrder: 3
        },
        {
            id: '272641109195260940',
            parentId: '272641109195260937',
            content: {title: '性能测试与优化', assignee: '孙八', workDays: '2'},
            sortOrder: 4
        },
        // 主任务 2
        {
            id: '272641109195260941',
            parentId: null,
            content: {title: '实时数据监控系统', assignee: '周九', workDays: '8'},
            sortOrder: 5
        },
        {
            id: '272641109195260942',
            parentId: '272641109195260941',
            content: {title: '监控指标定义', assignee: '周九', workDays: '2'},
            sortOrder: 6
        },
        {
            id: '272641109195260943',
            parentId: '272641109195260941',
            content: {title: '告警规则配置', assignee: '吴十', workDays: '3'},
            sortOrder: 7
        },
        {
            id: '272641109195260944',
            parentId: '272641109195260941',
            content: {title: '可视化大屏开发', assignee: '郑十一', workDays: '3'},
            sortOrder: 8
        },
    ];

    for (const s of selfItems) {
        const item = new ReportItemEntity();
        item.id = s.id;
        item.reportId = reportId;
        item.tabType = 'SELF';
        item.sourceType = 'MANUAL';
        item.parentId = s.parentId;
        item.contentJson = JSON.stringify(s.content);
        item.sortOrder = s.sortOrder;
        await dataSource.manager.save(item);
    }
    console.log('✅ SELF 标签页数据插入成功');

    // 5. 插入 PLAN 标签页数据
    const planItems = [
        {
            id: '272641109195260945',
            content: {
                jiraKey: 'DATADEV-201',
                title: '数据质量监控平台',
                status: 'Open',
                assignee: '张三',
                workDays: '15'
            },
            sortOrder: 1
        },
        {
            id: '272641109195260946',
            content: {
                jiraKey: 'DATADEV-202',
                title: '数据血缘分析工具',
                status: 'In Progress',
                assignee: '李四',
                workDays: '12'
            },
            sortOrder: 2
        },
        {
            id: '272641109195260947',
            content: {jiraKey: '', title: '数据安全加密方案', status: '计划中', assignee: '王五', workDays: '8'},
            sortOrder: 3
        },
    ];

    for (const p of planItems) {
        const item = new ReportItemEntity();
        item.id = p.id;
        item.reportId = reportId;
        item.tabType = 'PLAN';
        item.sourceType = p.content.jiraKey ? 'JIRA' : 'MANUAL';
        item.parentId = null;
        item.contentJson = JSON.stringify(p.content);
        item.sortOrder = p.sortOrder;
        await dataSource.manager.save(item);
    }
    console.log('✅ PLAN 标签页数据插入成功');

    // 6. 插入会议待办
    const note = new MeetingNoteEntity();
    note.id = '272641109195260948';
    note.reportId = reportId;
    note.content = `1. 下周一召开数据架构评审会议
2. 完成数据质量报告并提交给领导
3. 协调测试环境资源分配
4. 跟进生产环境部署计划
5. 组织团队技术分享会`;
    await dataSource.manager.save(note);
    console.log('✅ 会议待办插入成功');

    await dataSource.destroy();
    console.log('\n🎉 所有测试数据插入完成！');
}

insertTestData().catch(console.error);
