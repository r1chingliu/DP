# 阵容持仓

把券商持仓做成足球阵容与球星卡的移动端应用。

## 当前阶段

当前仓库已经进入可持续开发状态：

- 使用 `Expo + React Native + TypeScript`
- Git 仓库已初始化，可继续推送到远程仓库
- 第一版前端骨架已包含
  - 阵容主页
  - 球场布局
  - 球星卡详情
  - AI 排阵规则占位
  - 手动拖拽换位
  - 截图导入与 OCR 确认页

## 本地运行

```powershell
npm.cmd install
npm.cmd run start
```

如果你用手机预览，安装 Expo Go 后扫描二维码即可。

后端 OCR 服务启动：

```powershell
npm.cmd run backend:start
```

如果前端运行在浏览器，本地后端默认地址是 `http://127.0.0.1:8000`。

## 当前目录结构

```text
backend/        本地 OCR/API 服务
src/
  components/   UI 组件
  data/         模拟持仓数据
  lib/          排阵规则与状态处理
  services/     前端调用的接口层
  types/        核心类型定义
```

## 后续开发方向

- OCR：继续优化真实券商持仓截图识别效果
- AI：根据持仓结构推荐阵型、位置与角色文案
- 行情：延迟行情刷新
- 历史：持仓快照与阵容回看

详细方案见 [docs/ARCHITECTURE.md](/D:/Codex/docs/ARCHITECTURE.md)。
