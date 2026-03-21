import type { OcrExtractionResult } from '../types/portfolio';

export async function recognizePortfolioScreenshot(imageUri: string): Promise<OcrExtractionResult> {
  await delay(900);

  return {
    imageUri,
    brokerHint: '模拟识别结果',
    extractedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    rows: [
      {
        id: 'ocr-1',
        name: '沪深300ETF 510300',
        marketValue: '158000',
        pnlPercent: '8.3',
        costPrice: '3.86',
        currentPrice: '4.18',
        confidence: 0.98,
      },
      {
        id: 'ocr-2',
        name: '创业板ETF 159915',
        marketValue: '86000',
        pnlPercent: '-3.6',
        costPrice: '1.94',
        currentPrice: '1.87',
        confidence: 0.95,
      },
      {
        id: 'ocr-3',
        name: '证券ETF 512880',
        marketValue: '74000',
        pnlPercent: '12.1',
        costPrice: '0.92',
        currentPrice: '1.03',
        confidence: 0.92,
      },
      {
        id: 'ocr-4',
        name: '黄金ETF 518880',
        marketValue: '42000',
        pnlPercent: '4.1',
        costPrice: '4.82',
        currentPrice: '5.02',
        confidence: 0.89,
      },
      {
        id: 'ocr-5',
        name: '中国平安 601318',
        marketValue: '56000',
        pnlPercent: '6.4',
        costPrice: '42.7',
        currentPrice: '45.4',
        confidence: 0.86,
      },
    ],
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
