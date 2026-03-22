import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

dotenv.config({ path: '.env.local', quiet: true });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_TEXT_MODEL = process.env.DASHSCOPE_TEXT_MODEL || 'qwen3-coder-plus';
const PORT = Number(process.env.PORT || 8000);

let ocrWorkerPromise;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    textModel: DASHSCOPE_TEXT_MODEL,
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyConfigured: Boolean(DASHSCOPE_API_KEY),
    ocrEngine: 'tesseract.js chi_sim+eng',
  });
});

app.post('/api/lineup/suggest', async (req, res) => {
  try {
    if (!DASHSCOPE_API_KEY) {
      return res.status(500).json({ detail: 'DASHSCOPE_API_KEY is not configured' });
    }

    const players = Array.isArray(req.body?.players) ? req.body.players : [];
    if (!players.length) {
      return res.status(400).json({ detail: 'players is required' });
    }

    const suggestion = await suggestLineup(players);
    return res.json(suggestion);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Lineup suggestion failed';
    return res.status(502).json({ detail });
  }
});

app.post('/api/ocr/extract', upload.single('file'), async (req, res) => {
  try {
    if (!DASHSCOPE_API_KEY) {
      return res.status(500).json({ detail: 'DASHSCOPE_API_KEY is not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'Uploaded file is required' });
    }

    const worker = await getOcrWorker();
    const recognition = await worker.recognize(req.file.buffer);
    const rawText = recognition.data.text || '';

    if (!rawText.trim()) {
      return res.status(422).json({ detail: 'OCR did not detect readable text from the screenshot' });
    }

    const rows = await structurePortfolioText(rawText);
    return res.json({
      imageUri: `data:${req.file.mimetype || 'image/png'};base64,${req.file.buffer.toString('base64')}`,
      brokerHint: 'Tesseract OCR + DashScope Structuring',
      extractedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      rows,
      rawText,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'OCR extraction failed';
    return res.status(502).json({ detail });
  }
});

app.post('/api/market/weekly', async (req, res) => {
  try {
    const players = Array.isArray(req.body?.players) ? req.body.players : [];
    if (!players.length) {
      return res.status(400).json({ detail: 'players is required' });
    }

    const points = await buildWeeklyPerformance(players);
    return res.json({
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      points,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Market data request failed';
    return res.status(502).json({ detail });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Portfolio backend listening on http://127.0.0.1:${PORT}`);
});

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('chi_sim+eng', 1, {
      langPath: PROJECT_ROOT,
      cachePath: path.join(PROJECT_ROOT, '.tesseract-cache'),
    });
  }
  return ocrWorkerPromise;
}

async function structurePortfolioText(rawText) {
  const prompt = `
你是一个中文券商持仓 OCR 文本结构化助手。下面是一段从持仓截图识别出来的原始文本，请尽可能提取真实持仓行。

只返回 JSON，不要解释。JSON 结构必须是：
{
  "rows": [
    {
      "id": "row-1",
      "name": "证券名称，可带代码",
      "quantity": "股数或份额数字",
      "marketValue": "市值数字",
      "pnlPercent": "盈亏比例数字，可带负号，不带%",
      "costPrice": "成本价数字",
      "currentPrice": "现价数字",
      "confidence": 0.0
    }
  ]
}

规则：
1. 只保留能从 OCR 文本中判断出的真实持仓，不要编造。
2. 如果股数无法确认，优先尝试从“持仓/可用/数量/份额”附近抽取数字；实在不确定时填空字符串。
3. 如果字段不确定，填空字符串。
4. confidence 范围为 0 到 1。

OCR 原文如下：
${rawText}
`;

  const response = await fetch(`${DASHSCOPE_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DASHSCOPE_TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`DashScope request failed: ${responseText}`);
  }

  const payload = JSON.parse(responseText);
  const text = extractMessageText(payload);
  const parsed = extractJsonObject(text);

  if (!Array.isArray(parsed.rows)) {
    throw new Error('DashScope returned an unexpected response structure');
  }

  return parsed.rows.map((row, index) => ({
    id: row.id || `row-${index + 1}`,
    name: stringify(row.name),
    quantity: stringify(row.quantity),
    marketValue: stringify(row.marketValue),
    pnlPercent: stringify(row.pnlPercent),
    costPrice: stringify(row.costPrice),
    currentPrice: stringify(row.currentPrice),
    confidence: normalizeConfidence(row.confidence),
  }));
}

async function suggestLineup(players) {
  const prompt = `
你是一个把股票和 ETF 组合映射成足球阵容的助手。

请基于输入持仓返回 JSON，结构必须是：
{
  "formationName": "4-3-3",
  "summary": "中文点评",
  "playerNotes": [
    {
      "playerId": "xxx",
      "note": "中文角色说明"
    }
  ]
}

要求：
1. 只讨论组合结构和角色分工，不给投资建议。
2. summary 控制在 2 到 4 句。
3. playerNotes 为每个持仓写一句角色说明。

持仓数据如下：
${JSON.stringify(players)}
`;

  const response = await fetch(`${DASHSCOPE_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DASHSCOPE_TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`DashScope request failed: ${responseText}`);
  }

  const payload = JSON.parse(responseText);
  const text = extractMessageText(payload);
  const parsed = extractJsonObject(text);

  return {
    formationName: stringify(parsed.formationName) || '4-3-3',
    summary: stringify(parsed.summary),
    playerNotes: Array.isArray(parsed.playerNotes)
      ? parsed.playerNotes.map((item) => ({
          playerId: stringify(item.playerId),
          note: stringify(item.note),
        }))
      : [],
  };
}

async function buildWeeklyPerformance(players) {
  const normalizedPlayers = players
    .map((player) => ({
      ticker: stringify(player.ticker),
      quantity: Number(player.quantity) || 0,
    }))
    .filter((player) => player.ticker && player.quantity > 0);

  if (!normalizedPlayers.length) {
    throw new Error('No valid holdings with quantity were provided');
  }

  const historyEntries = await Promise.all([
    Promise.all(
      normalizedPlayers.map(async (player) => ({
        ticker: player.ticker,
        quantity: player.quantity,
        points: await fetchSecurityHistory(player.ticker),
      })),
    ),
    fetchSecurityHistory('000001'),
    fetchSecurityHistory('000300'),
  ]);

  const holdingSeries = historyEntries[0];
  const shanghaiSeries = historyEntries[1];
  const csi300Series = historyEntries[2];

  const sharedLabels = getSharedLabels([
    ...holdingSeries.map((item) => item.points),
    shanghaiSeries,
    csi300Series,
  ]).slice(-8);

  if (!sharedLabels.length) {
    throw new Error('Unable to build weekly performance series');
  }

  const portfolioRaw = sharedLabels.map((label) =>
    holdingSeries.reduce((sum, item) => sum + item.quantity * (item.points.get(label) || 0), 0),
  );
  const shanghaiRaw = sharedLabels.map((label) => shanghaiSeries.get(label) || 0);
  const csi300Raw = sharedLabels.map((label) => csi300Series.get(label) || 0);

  const portfolioBase = portfolioRaw[0] || 1;
  const shanghaiBase = shanghaiRaw[0] || 1;
  const csi300Base = csi300Raw[0] || 1;

  return sharedLabels.map((label, index) => ({
    label,
    portfolio: round2((portfolioRaw[index] / portfolioBase) * 100),
    shanghai: round2((shanghaiRaw[index] / shanghaiBase) * 100),
    csi300: round2((csi300Raw[index] / csi300Base) * 100),
  }));
}

async function fetchSecurityHistory(ticker) {
  const symbol = normalizeSymbol(ticker);
  const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=60`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch market history for ${ticker}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || !payload.length) {
    throw new Error(`Market history is empty for ${ticker}`);
  }

  return aggregateDailyToWeekly(payload);
}

function normalizeSymbol(ticker) {
  if (ticker === '000001') {
    return 'sh000001';
  }

  if (ticker === '000300') {
    return 'sh000300';
  }

  if (/^(5|6|9)\d{5}$/.test(ticker)) {
    return `sh${ticker}`;
  }

  if (/^(0|1|2|3)\d{5}$/.test(ticker)) {
    return `sz${ticker}`;
  }

  return `sh${ticker}`;
}

function getSharedLabels(seriesList) {
  if (!seriesList.length) {
    return [];
  }

  const labels = [...seriesList[0].keys()];
  return labels.filter((label) => seriesList.every((series) => series.has(label)));
}

function aggregateDailyToWeekly(rows) {
  const weekly = new Map();

  for (const item of rows) {
    if (!item?.day || !item?.close) {
      continue;
    }

    const day = String(item.day);
    const weekLabel = buildWeekLabel(day);
    weekly.set(weekLabel, Number(item.close) || 0);
  }

  return weekly;
}

function buildWeekLabel(day) {
  const date = new Date(`${day}T00:00:00+08:00`);
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function extractMessageText(payload) {
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'text')
      .map((part) => String(part.text || ''))
      .join('\n');
  }

  throw new Error('DashScope returned an unsupported content payload');
}

function extractJsonObject(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('DashScope did not return JSON content');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function stringify(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
