import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createWorker } from 'tesseract.js';

dotenv.config({ path: '.env.local' });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_TEXT_MODEL = process.env.DASHSCOPE_TEXT_MODEL || 'qwen3-coder-plus';
const PORT = Number(process.env.PORT || 8000);

let ocrWorkerPromise;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    textModel: DASHSCOPE_TEXT_MODEL,
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyConfigured: Boolean(DASHSCOPE_API_KEY),
    ocrEngine: 'tesseract.js chi_sim+eng',
  });
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Portfolio backend listening on http://127.0.0.1:${PORT}`);
});

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('chi_sim+eng');
  }
  return ocrWorkerPromise;
}

async function structurePortfolioText(rawText) {
  const prompt = `
你是一个中文券商持仓 OCR 文本结构化助手。下面是从券商截图识别出的原始文本，请尽可能整理成持仓表。

要求：
1. 只返回 JSON，不要解释。
2. JSON 结构必须是：
{
  "rows": [
    {
      "id": "row-1",
      "name": "证券名称，可带代码",
      "marketValue": "市值数字",
      "pnlPercent": "盈亏比例数字，可带负号，不带%",
      "costPrice": "成本价数字",
      "currentPrice": "现价数字",
      "confidence": 0.0
    }
  ]
}
3. 只保留真实能从 OCR 文本中判断出的持仓行，不要编造。
4. 字段不确定时填空字符串。
5. confidence 取 0 到 1 的小数。

OCR 原始文本如下：
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
    marketValue: stringify(row.marketValue),
    pnlPercent: stringify(row.pnlPercent),
    costPrice: stringify(row.costPrice),
    currentPrice: stringify(row.currentPrice),
    confidence: normalizeConfidence(row.confidence),
  }));
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
