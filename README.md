# 阵容持仓

把券商持仓做成足球阵容与球星卡的移动端应用。

## 当前状态

项目已经可以继续开发和跨电脑接力：

- 前端：`Expo + React Native + TypeScript`
- 后端：本地 Node API，负责 OCR、AI 排阵和延迟行情聚合
- Git 仓库已推送到远程
- 当前远程地址：`ssh://git@ssh.github.com:443/r1chingliu/DP.git`

## 快速开始

先安装依赖：

```powershell
npm.cmd install
```

再启动后端：

```powershell
npm.cmd run backend:start
```

最后启动前端：

```powershell
npm.cmd run start
```

浏览器预览可用：

```powershell
npx.cmd expo start --web --port 8083
```

## 环境变量

复制 `.env.example` 为 `.env.local`，并填入可用配置：

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
DASHSCOPE_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
DASHSCOPE_API_KEY=your-api-key
DASHSCOPE_TEXT_MODEL=qwen3-coder-plus
```

说明：

- `.env.local` 不应提交到 Git
- 没有 `DASHSCOPE_API_KEY` 时，AI 排阵不可用
- OCR 仍可走本地规则兜底，但识别质量会下降

## 目录结构

```text
backend/        本地 OCR / AI / 行情 API
docs/           架构和迁移文档
src/
  components/   UI 组件
  data/         模拟数据
  lib/          阵容规则、持仓转换、游戏化逻辑
  services/     前端 API 调用
  types/        核心类型
```

## 另一台电脑接手

详细步骤见 [docs/HANDOFF.md](/D:/Codex/docs/HANDOFF.md)。

## 当前已完成

- 阵容首页
- 球场布局
- 球星卡详情
- 长按拖拽换位原型
- AI 排阵接口接入
- OCR 导入确认页
- OCR 本地规则兜底
- 周度走势接口

## 后续优先级

- 提升券商截图 OCR 准确率
- 优化拖拽手势流畅度
- 增强 OCR 字段纠错规则
- 加入历史快照与阵容回看
- 补充真实行情刷新策略
