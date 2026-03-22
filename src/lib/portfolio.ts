import type { ExtractedHoldingRow, PortfolioPlayer, RoleProfile } from '../types/portfolio';

const themeLookup: Array<{
  pattern: RegExp;
  themes: string[];
  roleProfile: RoleProfile;
  roleLabel: string;
}> = [
  { pattern: /黄金|gold/i, themes: ['避险', '商品'], roleProfile: 'keeper', roleLabel: '守门员' },
  { pattern: /国债|债|bond/i, themes: ['债券', '低波'], roleProfile: 'anchor', roleLabel: '后腰屏障' },
  {
    pattern: /300|500|1000|上证|沪深|宽基/i,
    themes: ['宽基', '核心底仓'],
    roleProfile: 'engine',
    roleLabel: '中场发动机',
  },
  {
    pattern: /证券|芯片|科技|创业板|纳指/i,
    themes: ['成长', '高弹性'],
    roleProfile: 'wing',
    roleLabel: '冲击型边锋',
  },
  {
    pattern: /红利|银行|平安|蓝筹/i,
    themes: ['红利', '防守'],
    roleProfile: 'shield',
    roleLabel: '防守型后卫',
  },
];

export function buildPlayersFromExtraction(rows: ExtractedHoldingRow[]): PortfolioPlayer[] {
  const sanitized = rows
    .map((row, index) => {
      const quantity = parseQuantity(row.quantity, row.marketValue, row.currentPrice, row.costPrice);
      const marketValue = parseMarketValue(row.marketValue);
      const pnlPercent = parsePercent(row.pnlPercent);
      const costPrice = parsePrice(row.costPrice, row.name);
      const currentPrice = parsePrice(row.currentPrice, row.name);

      return {
        row,
        index,
        quantity,
        marketValue,
        pnlPercent,
        costPrice,
        currentPrice,
      };
    })
    .filter(({ row, marketValue }) => row.name.trim().length > 0 && marketValue > 0);

  const totalMarketValue = sanitized.reduce((sum, row) => sum + row.marketValue, 0) || 1;

  return sanitized.map(({ row, quantity, marketValue, pnlPercent, costPrice, currentPrice, index }) => {
    const normalizedName = normalizeAssetName(row.name);
    const profile = inferProfile(normalizedName);
    const codeMatch = normalizedName.match(/\d{6}/);

    return {
      id: codeMatch?.[0] ?? `asset-${index + 1}`,
      ticker: codeMatch?.[0] ?? `A${String(index + 1).padStart(3, '0')}`,
      name: normalizedName,
      kind: /etf|lof/i.test(normalizedName) ? 'etf' : 'stock',
      quantity,
      marketValue,
      pnlPercent,
      costPrice,
      currentPrice,
      weightPercent: Number(((marketValue / totalMarketValue) * 100).toFixed(1)),
      themes: profile.themes,
      roleProfile: profile.roleProfile,
      roleLabel: profile.roleLabel,
      aiSummary: buildAiSummary(normalizedName, profile.roleLabel, profile.themes),
    };
  });
}

export function normalizeExtractedRows(rows: ExtractedHoldingRow[]) {
  return rows
    .map((row) => ({
      ...row,
      name: normalizeAssetName(row.name),
      quantity: formatNumericString(
        parseQuantity(row.quantity, row.marketValue, row.currentPrice, row.costPrice),
        0,
      ),
      marketValue: formatNumericString(parseMarketValue(row.marketValue), 0),
      pnlPercent: formatNumericString(parsePercent(row.pnlPercent), 1),
      costPrice: formatNumericString(parsePrice(row.costPrice, row.name), 2),
      currentPrice: formatNumericString(parsePrice(row.currentPrice, row.name), 2),
    }))
    .filter((row) => row.name || row.marketValue || row.quantity);
}

function parseMarketValue(value: string) {
  return parseIntegerLike(value);
}

function parseQuantity(
  quantityText: string,
  marketValueText: string,
  currentPriceText: string,
  costPriceText: string,
) {
  const normalized = normalizeNumericText(quantityText, { keepDecimal: false });
  const parsed = Number(normalized);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }

  const marketValue = parseMarketValue(marketValueText);
  const currentPrice = parsePrice(currentPriceText, '');
  const costPrice = parsePrice(costPriceText, '');
  const fallbackPrice = currentPrice || costPrice;

  if (marketValue > 0 && fallbackPrice > 0) {
    return Math.max(1, Math.round(marketValue / fallbackPrice));
  }

  return 0;
}

function parsePercent(value: string) {
  const normalized = normalizeNumericText(value, { keepDecimal: true });
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (!normalized.includes('.') && Math.abs(parsed) >= 10 && Math.abs(parsed) < 1000) {
    return parsed / 10;
  }

  return parsed;
}

function parsePrice(value: string, assetName: string) {
  const normalized = normalizeNumericText(value, { keepDecimal: true });
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  if (normalized.includes('.')) {
    return parsed;
  }

  const digitsOnly = normalized.replace('-', '');
  const looksLikeFund =
    /etf|lof|指数|基金|创业板|纳指|黄金|国债|沪深|上证/i.test(assetName);

  if (looksLikeFund && digitsOnly.length >= 3) {
    return parsed / 100;
  }

  return parsed;
}

function parseIntegerLike(value: string) {
  const normalized = normalizeNumericText(value, { keepDecimal: false });
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNumericText(value: string, options: { keepDecimal: boolean }) {
  const cleaned = value
    .replace(/[¥￥,\s%元股份]/g, '')
    .replace(/[OoＯо]/g, '0')
    .replace(/[Il|丨]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[B]/g, '8')
    .replace(/[。．]/g, '.')
    .replace(/[^0-9.\-]/g, '');

  if (!cleaned) {
    return '';
  }

  const sign = cleaned.startsWith('-') ? '-' : '';
  const body = cleaned.replace(/-/g, '');

  if (options.keepDecimal) {
    const [head, ...rest] = body.split('.');
    return sign + (rest.length ? `${head}.${rest.join('')}` : head);
  }

  return sign + body.replace(/\./g, '');
}

function normalizeAssetName(value: string) {
  return value
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/[%$]/g, '')
    .trim();
}

function inferProfile(name: string) {
  const found = themeLookup.find((item) => item.pattern.test(name));
  if (found) {
    return found;
  }

  return {
    themes: ['自定义', '待确认'],
    roleProfile: 'engine' as RoleProfile,
    roleLabel: '中场组织者',
  };
}

function buildAiSummary(name: string, roleLabel: string, themes: string[]) {
  return `${name} 当前被编排为${roleLabel}，主要依据是 ${themes.join(' / ')} 标签与仓位结构。`;
}

function formatNumericString(value: number, digits: number) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return digits === 0 ? String(Math.round(value)) : value.toFixed(digits);
}
