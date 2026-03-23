# 跨电脑接手说明

## 远程仓库

当前项目远程地址：

```text
ssh://git@ssh.github.com:443/r1chingliu/DP.git
```

## 新电脑首次接手

### 1. 安装基础环境

需要这些工具：

- Git
- Node.js LTS

### 2. 克隆仓库

```powershell
git clone ssh://git@ssh.github.com:443/r1chingliu/DP.git
cd DP
```

### 3. 配置环境变量

把 `.env.example` 复制成 `.env.local`：

```powershell
Copy-Item .env.example .env.local
```

然后修改 `.env.local`，至少填入：

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
DASHSCOPE_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
DASHSCOPE_API_KEY=你的 DashScope API Key
DASHSCOPE_TEXT_MODEL=qwen3-coder-plus
```

### 4. 安装依赖

```powershell
npm.cmd install
```

### 5. 启动后端

```powershell
npm.cmd run backend:start
```

健康检查地址：

```text
http://127.0.0.1:8000/api/health
```

### 6. 启动前端

```powershell
npm.cmd run start
```

如果要在浏览器里看：

```powershell
npx.cmd expo start --web --port 8083
```

## iPhone 预览

- 安装 `Expo Go`
- 前端启动后，用 Expo 提供的二维码连接
- Windows 不能本地编译 iOS 原生包，但可以用 Expo Go 预览

## 现在已经具备的功能

- 阵容主页
- 足球场可视化
- 球星卡详情
- 长按拖拽换位
- AI 排阵建议
- OCR 截图导入
- OCR 确认页
- OCR 规则兜底

## 已知注意点

- `.env.local` 不会随 Git 同步
- 新电脑如果没有 API key，AI 与 OCR 结构化能力会受影响
- OCR 中文识别依赖仓库根目录下的 `chi_sim.traineddata` 和 `eng.traineddata`

## 建议的接手顺序

1. 先跑通后端健康检查
2. 再跑前端
3. 先试 AI 排阵
4. 再试 OCR 导入
