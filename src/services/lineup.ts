import type { AiLineupSuggestion, PortfolioPlayer } from '../types/portfolio';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export async function requestAiLineupSuggestion(
  players: PortfolioPlayer[],
): Promise<AiLineupSuggestion> {
  const response = await fetch(`${API_BASE_URL}/api/lineup/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      players: players.map((player) => ({
        id: player.id,
        ticker: player.ticker,
        name: player.name,
        kind: player.kind,
        marketValue: player.marketValue,
        pnlPercent: player.pnlPercent,
        weightPercent: player.weightPercent,
        roleLabel: player.roleLabel,
        themes: player.themes,
      })),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Lineup suggestion failed with status ${response.status}`);
  }

  return response.json() as Promise<AiLineupSuggestion>;
}
