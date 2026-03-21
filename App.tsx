import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BenchStrip } from './src/components/BenchStrip';
import { ImportReviewScreen } from './src/components/ImportReviewScreen';
import { PitchBoard } from './src/components/PitchBoard';
import { PortfolioSummary } from './src/components/PortfolioSummary';
import { StarCardModal } from './src/components/StarCardModal';
import { mockPortfolio } from './src/data/mockPortfolio';
import { buildRecommendedLineup, createInitialAssignments, getBenchPlayers, getLineupPlayer, getPitchSlots, movePlayerBetweenTargets, toggleSlotLock } from './src/lib/lineup';
import { buildPlayersFromExtraction } from './src/lib/portfolio';
import { extractPortfolioFromBackend } from './src/services/backend';
import type { ExtractedHoldingRow, OcrExtractionResult, PortfolioPlayer } from './src/types/portfolio';

type ScreenMode = 'lineup' | 'review';

export default function App() {
  const [players, setPlayers] = useState(mockPortfolio.players);
  const [updatedAt, setUpdatedAt] = useState(mockPortfolio.updatedAt);
  const [lineup, setLineup] = useState(() => createInitialAssignments(buildRecommendedLineup(mockPortfolio.players)));
  const [selectedPlayer, setSelectedPlayer] = useState<PortfolioPlayer | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('lineup');
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [extraction, setExtraction] = useState<OcrExtractionResult | null>(null);

  const pitchSlots = useMemo(() => getPitchSlots(), []);
  const benchPlayers = useMemo(() => getBenchPlayers(players, lineup), [lineup, players]);
  const totalMarketValue = useMemo(() => players.reduce((sum, player) => sum + player.marketValue, 0), [players]);

  const handleOpenPlayer = (playerId: string | null) => {
    if (!playerId) {
      return;
    }
    const player = players.find((item) => item.id === playerId) ?? null;
    setSelectedPlayer(player);
  };

  const handleAutoLineup = () => {
    setLineup(createInitialAssignments(buildRecommendedLineup(players)));
  };

  const handleToggleLock = (slotId: string) => {
    setLineup((current) => toggleSlotLock(current, slotId));
  };

  const handleImportScreenshot = async () => {
    try {
      setIsImporting(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相册权限', '请允许访问相册，才能选择券商持仓截图。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const nextExtraction = await extractPortfolioFromBackend(result.assets[0]);
      setExtraction(nextExtraction);
      setScreenMode('review');
    } catch (error) {
      const message = error instanceof Error ? error.message : '截图导入流程执行失败，请稍后重试。';
      Alert.alert('导入失败', message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateRow = (rowId: string, patch: Partial<ExtractedHoldingRow>) => {
    setExtraction((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
          }
        : current,
    );
  };

  const handleConfirmImport = async () => {
    if (!extraction) {
      return;
    }

    setIsSubmittingImport(true);
    const importedPlayers = buildPlayersFromExtraction(extraction.rows);
    setPlayers(importedPlayers);
    setUpdatedAt(extraction.extractedAt);
    setLineup(createInitialAssignments(buildRecommendedLineup(importedPlayers)));
    setScreenMode('lineup');
    setExtraction(null);
    setIsSubmittingImport(false);
  };

  if (screenMode === 'review' && extraction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ImportReviewScreen
          extraction={extraction}
          isSubmitting={isSubmittingImport}
          onBack={() => {
            setScreenMode('lineup');
            setExtraction(null);
          }}
          onConfirm={handleConfirmImport}
          onUpdateRow={handleUpdateRow}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Lineup Portfolio</Text>
            <Text style={styles.title}>阵容持仓</Text>
            <Text style={styles.subtitle}>
              用足球阵型管理股票和 ETF。当前版本已经支持导入截图、确认字段和自动重建阵容。
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={handleImportScreenshot} disabled={isImporting}>
              <Text style={styles.secondaryButtonText}>{isImporting ? '识别中...' : '导入截图'}</Text>
            </Pressable>
            <Pressable style={styles.aiButton} onPress={handleAutoLineup}>
              <Text style={styles.aiButtonText}>AI 重新排阵</Text>
            </Pressable>
          </View>
        </View>

        <PortfolioSummary players={players} totalMarketValue={totalMarketValue} formationName={lineup.formationName} updatedAt={updatedAt} />

        <View style={styles.hintCard}>
          <Text style={styles.hintLabel}>当前操作</Text>
          <Text style={styles.hintText}>
            轻点卡片进入详情，长按首发球员后拖到另一个位置，松手即可自动换位。导入截图后会进入 OCR 确认页。
          </Text>
        </View>

        <PitchBoard
          lineup={lineup}
          slots={pitchSlots}
          onOpenPlayer={handleOpenPlayer}
          onMovePlayer={(sourceSlotId, targetSlotId) =>
            setLineup((current) =>
              movePlayerBetweenTargets(
                current,
                { kind: 'slot', id: sourceSlotId },
                { kind: 'slot', id: targetSlotId },
              ),
            )
          }
          getPlayer={(playerId) => getLineupPlayer(players, playerId)}
        />

        <BenchStrip benchPlayers={benchPlayers} onOpenPlayer={(playerId) => handleOpenPlayer(playerId)} />

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>当前开发重点</Text>
          <Text style={styles.footerText}>1. 已打通截图导入、真实 OCR 后端、人工确认、重建阵容。</Text>
          <Text style={styles.footerText}>2. 下一步接入阿里 DashScope 阵容建议接口和位置文案。</Text>
          <Text style={styles.footerText}>3. 然后补拖拽进替补席、历史快照和延迟行情。</Text>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={Boolean(selectedPlayer)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <StarCardModal
              player={selectedPlayer}
              slot={selectedPlayer ? lineup.slots.find((slot) => slot.playerId === selectedPlayer.id) ?? null : null}
              onClose={() => setSelectedPlayer(null)}
              onToggleLock={(slotId) => handleToggleLock(slotId)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#08141f',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    gap: 14,
  },
  kicker: {
    color: '#8bd0a7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#f5f8f9',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a9bcc5',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#123346',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#d7edf7',
    fontWeight: '800',
    fontSize: 14,
  },
  aiButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#8bd0a7',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  aiButtonText: {
    color: '#0f231d',
    fontWeight: '800',
    fontSize: 14,
  },
  hintCard: {
    backgroundColor: '#0e2130',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f3b4d',
  },
  hintLabel: {
    color: '#7ca5bd',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  hintText: {
    color: '#dce8ec',
    fontSize: 14,
    lineHeight: 20,
  },
  footerCard: {
    backgroundColor: '#0f1d28',
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  footerTitle: {
    color: '#f2f7f8',
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    color: '#a8bcc6',
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 18, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#09161f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    minHeight: '62%',
  },
});
