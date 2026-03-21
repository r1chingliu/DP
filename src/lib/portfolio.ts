import type { ExtractedHoldingRow, PortfolioPlayer, RoleProfile } from '../types/portfolio';

const themeLookup: Array<{ pattern: RegExp; themes: string[]; roleProfile: RoleProfile; roleLabel: string }> = [
  { pattern: /黄金|gold/i, themes: ['避险', '商品'], roleProfile: 'keeper', roleLabel: '守门员' },
  { pattern: /国债|债|bond/i, themes: ['债券', '低波'], roleProfile: 'anchor', roleLabel: '后腰屏障' },
  { pattern: /300|500|1000|上证|沪深|宽基/i, themes: ['宽基', '核心底仓'], roleProfile: 'engine', roleLabel: '中场发动机' },
  { pattern: /证券|芯片|科技|创业板|纳指/i, themes: ['成长', '高弹性'], roleProfile: 'wing', roleLabel: '冲击型边锋' },
  { pattern: /红利|银行|平安|蓝筹/i, themes: ['红利', '防守'], roleProfile: 'shield', roleLabel: '防守型后卫' },
];

export function buildPlayersFromExtraction(rows: ExtractedHoldingRow[]): PortfolioPlayer[] {
  const sanitized = rows.map((row, index) => {
    const marketValue = parseNumeric(row.marketValue);
    const pnlPercent = parseNumeric(row.pnlPercent);
    const costPrice = parseNumeric(row.costPrice);
    const currentPrice = parseNumeric(row.currentPrice);
    return {
      row,
      index,
      marketValue,
      pnlPercent,
      costPrice,
      currentPrice,
    };
  });

  const totalMarketValue = sanitized.reduce((sum, row) => sum + row.marketValue, 0) || 1;

  return sanitized.map(({ row, marketValue, pnlPercent, costPrice, currentPrice, index }) => {
    const profile = inferProfile(row.name);
    const codeMatch = row.name.match(/\d{6}/);

    return {
      id: codeMatch?.[0] ?? `asset-${index + 1}`,
      ticker: codeMatch?.[0] ?? `A${String(index + 1).padStart(3, '0')}`,
      name: row.name,
      kind: /etf/i.test(row.name) ? 'etf' : 'stock',
      marketValue,
      pnlPercent,
      costPrice,
      currentPrice,
      weightPercent: Number(((marketValue / totalMarketValue) * 100).toFixed(1)),
      themes: profile.themes,
      roleProfile: profile.roleProfile,
      roleLabel: profile.roleLabel,
      aiSummary: buildAiSummary(row.name, profile.roleLabel, profile.themes),
    };
  });
}

export function parseNumeric(value: string) {
  const cleaned = value.replace(/[,，%\s元¥]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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
