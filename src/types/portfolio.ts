export type AssetKind = 'stock' | 'etf';

export type RoleProfile =
  | 'keeper'
  | 'anchor'
  | 'shield'
  | 'engine'
  | 'wing'
  | 'striker';

export type SlotGroup = 'keeper' | 'defense' | 'midfield' | 'attack';

export type PortfolioPlayer = {
  id: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  quantity: number;
  marketValue: number;
  pnlPercent: number;
  costPrice: number;
  currentPrice: number;
  weightPercent: number;
  themes: string[];
  roleProfile: RoleProfile;
  roleLabel: string;
  aiSummary: string;
};

export type PitchSlot = {
  id: string;
  label: string;
  shortLabel: string;
  group: SlotGroup;
  x: number;
  y: number;
};

export type LineupSlotAssignment = {
  slotId: string;
  playerId: string | null;
  locked: boolean;
};

export type LineupState = {
  formationName: string;
  slots: LineupSlotAssignment[];
};

export type ExtractedHoldingRow = {
  id: string;
  name: string;
  quantity: string;
  marketValue: string;
  pnlPercent: string;
  costPrice: string;
  currentPrice: string;
  confidence: number;
};

export type OcrExtractionResult = {
  imageUri: string;
  brokerHint: string;
  extractedAt: string;
  rows: ExtractedHoldingRow[];
  rawText?: string;
};

export type AiLineupSuggestion = {
  formationName: string;
  summary: string;
  playerNotes: Array<{
    playerId: string;
    note: string;
  }>;
};

export type WeeklyPerformancePoint = {
  label: string;
  portfolio: number;
  shanghai: number;
  csi300: number;
};

export type WeeklyPerformanceResponse = {
  updatedAt: string;
  points: WeeklyPerformancePoint[];
};
