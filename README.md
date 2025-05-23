# TechManWorkflow-JointJS

工作流设计器 - 基于JointJS的模块化架构

## 🚀 项目特性

- **模块化架构**: 代码按功能分模块组织，易于维护和扩展
- **TypeScript支持**: 渐进式TypeScript迁移，增强类型安全
- **完整测试覆盖**: Jest单元测试，确保代码质量
- **现代化工具**: ESLint代码检查，自动化构建流程
- **JointJS集成**: 基于强大的图形库构建工作流编辑器

## 📁 项目结构

```
TechManWorkflow-JointJS/
├── js/                          # 主要源代码
│   ├── core/                    # 核心模块
│   │   ├── constants.js         # 配置常量和枚举
│   │   └── graph.js            # JointJS图形核心管理
│   ├── utils/                   # 工具函数
│   │   └── helpers.js          # 通用工具函数库
│   ├── features/                # 功能模块
│   │   └── node-manager.js     # 节点创建和管理
│   ├── components/              # UI组件
│   │   └── sidebar.js          # 侧边栏组件
│   └── main.js                 # 应用入口和全局API
├── types/                       # TypeScript类型定义
│   └── index.d.ts              # 全局类型声明
├── tests/                       # 测试文件
│   ├── setup.js                # Jest测试环境设置
│   ├── utils/                  # 工具函数测试
│   ├── features/               # 功能模块测试
│   └── components/             # 组件测试
├── index.html                  # 主页面
├── package.json                # 项目配置和依赖
├── tsconfig.json              # TypeScript配置
└── README.md                  # 项目文档
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 运行测试
npm run test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 代码检查
npm run lint

# 构建项目
npm run build
```

## 🏗️ 架构设计

### 模块化设计

项目采用模块化架构，每个模块职责明确：

- **core**: 核心功能和配置
- **utils**: 通用工具函数
- **features**: 业务功能模块
- **components**: UI组件

### TypeScript集成

项目采用渐进式TypeScript迁移策略：

1. **类型定义**: 通过`types/index.d.ts`提供完整类型声明
2. **JSDoc注释**: 在JavaScript文件中添加类型注释
3. **严格检查**: 启用TypeScript严格模式进行类型检查

### 错误处理

统一的错误处理机制：

```javascript
// 使用ErrorHandler处理错误
try {
  // 业务逻辑
} catch (error) {
  ErrorHandler.handle(error, '操作上下文');
}

// 安全执行函数
const result = await ErrorHandler.safeExecute(riskyFunction, '操作描述');
```

### 事件管理

统一的事件监听器管理：

```javascript
// 创建事件管理器
const eventManager = new EventManager();

// 添加事件监听器
eventManager.addEventListener(element, 'click', handler);

// 清理所有监听器
eventManager.removeAllListeners();
```

## 🧪 测试

### 测试框架

- **Jest**: 单元测试框架
- **jsdom**: DOM环境模拟
- **Mock对象**: JointJS和其他依赖的模拟

### 测试覆盖

- ✅ 工具函数 (helpers.js)
- ✅ 节点管理器 (node-manager.js) 
- ✅ 侧边栏组件 (sidebar.js)
- ✅ 错误处理机制
- ✅ 事件管理系统

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 📋 API文档

### 全局API

```javascript
// 工作流操作
WorkflowAPI.saveWorkflow()           // 保存工作流
WorkflowAPI.loadWorkflow(file)       // 加载工作流文件
WorkflowAPI.validateWorkflow()       // 验证工作流
WorkflowAPI.clearWorkflow()          // 清空工作流

// 视图控制
WorkflowAPI.zoomCanvas(delta)        // 缩放画布
WorkflowAPI.resetZoom()              // 重置缩放
WorkflowAPI.togglePanMode()          // 切换平移模式

// 统计信息
WorkflowAPI.getWorkflowStats()       // 获取工作流统计
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存工作流 |
| Ctrl+Z | 撤销操作 |
| Ctrl+Y | 重做操作 |
| Ctrl+A | 全选元素 |
| Delete | 删除选中元素 |
| Ctrl++ | 放大 |
| Ctrl+- | 缩小 |
| Ctrl+0 | 重置缩放 |
| Space | 平移模式 |

## 🔧 配置

### 配置文件

所有配置都在`js/core/constants.js`中定义：

```javascript
const CONFIG = {
  canvas: {
    gridSize: 20,
    background: '#f8f9fa',
    sidebarWidth: 140
  },
  nodes: {
    defaultSize: { width: 100, height: 60 },
    colors: {
      start: '#4caf50',
      end: '#f44336',
      process: '#2196f3'
    }
  }
};
```

### 自定义主题

可以通过修改配置文件来自定义主题：

```javascript
// 修改节点颜色
CONFIG.nodes.colors.start = '#your-color';

// 修改画布设置
CONFIG.canvas.background = '#your-background';
```

## 🎯 最佳实践

### 代码风格

- 使用ES6+语法
- 遵循ESLint规则
- 添加详细的JSDoc注释
- 保持函数简短和单一职责

### 错误处理

- 使用统一的ErrorHandler
- 提供有意义的错误上下文
- 避免静默失败

### 性能优化

- 使用防抖/节流优化高频事件
- 及时清理事件监听器
- 避免内存泄漏

### 测试规范

- 每个功能都要有对应测试
- 测试要覆盖正常和异常情况
- 使用描述性的测试名称

## 🚀 部署

### 开发环境

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
```

构建文件将输出到`dist/`目录。

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 遵循现有代码风格
- 添加相应的测试
- 更新文档
- 确保所有测试通过

## 📝 更新日志

### v1.0.0 (2024-01-01)

- ✨ 初始版本发布
- 🏗️ 模块化架构重构
- 📝 TypeScript类型定义
- 🧪 完整测试覆盖
- 📚 详细文档

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [JointJS](https://www.jointjs.com/) - 强大的图形库
- [Jest](https://jestjs.io/) - 优秀的测试框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的JavaScript

## 📞 支持

如有问题或建议，请：

- 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 发送邮件至 support@example.com
- 查看[Wiki文档](https://github.com/your-repo/wiki)

---

**Happy Coding! 🎉**
