import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExtractedHoldingRow, OcrExtractionResult } from '../types/portfolio';

type ImportReviewScreenProps = {
  extraction: OcrExtractionResult;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onUpdateRow: (rowId: string, patch: Partial<ExtractedHoldingRow>) => void;
};

export function ImportReviewScreen({
  extraction,
  isSubmitting,
  onBack,
  onConfirm,
  onUpdateRow,
}: ImportReviewScreenProps) {
  const avgConfidence = useMemo(() => {
    const total = extraction.rows.reduce((sum, row) => sum + row.confidence, 0);
    return extraction.rows.length ? Math.round((total / extraction.rows.length) * 100) : 0;
  }, [extraction.rows]);

  const lowConfidenceCount = useMemo(
    () => extraction.rows.filter((row) => row.confidence < 0.88).length,
    [extraction.rows],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>OCR Review</Text>
          <Pressable onPress={onBack}>
            <Text style={styles.backLink}>关闭</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>识别确认页</Text>
        <Text style={styles.subtitle}>
          这里是导入前的人工校验层。名称、成本价、市价、盈亏比例看起来不对时，先在这里改正再导入。
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>来源</Text>
          <Text style={styles.summaryValue}>{extraction.brokerHint}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryLabel}>平均置信度</Text>
          <Text style={styles.summaryValue}>{avgConfidence}%</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="识别行数" value={String(extraction.rows.length)} />
        <MetricCard label="低置信度" value={String(lowConfidenceCount)} accent="#ffcf7d" />
      </View>

      {extraction.warnings?.length ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>导入提醒</Text>
          {extraction.warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              • {warning}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.previewCard}>
        <Text style={styles.sectionTitle}>截图预览</Text>
        <Image source={{ uri: extraction.imageUri }} style={styles.previewImage} resizeMode="cover" />
        <Text style={styles.previewHint}>识别时间：{extraction.extractedAt}</Text>
      </View>

      {extraction.rawText ? (
        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>OCR 原始文本</Text>
          <Text style={styles.rawText}>{extraction.rawText}</Text>
        </View>
      ) : null}

      <View style={styles.tableCard}>
        <Text style={styles.sectionTitle}>识别字段</Text>
        {extraction.rows.map((row) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{row.name || '未识别名称'}</Text>
              <ConfidenceBadge confidence={row.confidence} />
            </View>
            <EditableField label="持仓名称" value={row.name} onChangeText={(value) => onUpdateRow(row.id, { name: value })} />
            <EditableField
              label="数量"
              value={row.quantity}
              onChangeText={(value) => onUpdateRow(row.id, { quantity: value })}
              keyboardType="numeric"
            />
            <EditableField
              label="市值"
              value={row.marketValue}
              onChangeText={(value) => onUpdateRow(row.id, { marketValue: value })}
              keyboardType="numeric"
            />
            <EditableField
              label="盈亏比例"
              value={row.pnlPercent}
              onChangeText={(value) => onUpdateRow(row.id, { pnlPercent: value })}
              keyboardType="numeric"
            />
            <EditableField
              label="成本价"
              value={row.costPrice}
              onChangeText={(value) => onUpdateRow(row.id, { costPrice: value })}
              keyboardType="numeric"
            />
            <EditableField
              label="市价"
              value={row.currentPrice}
              onChangeText={(value) => onUpdateRow(row.id, { currentPrice: value })}
              keyboardType="numeric"
            />
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
        onPress={onConfirm}
        disabled={isSubmitting}
      >
        <Text style={styles.confirmButtonText}>
          {isSubmitting ? '正在导入...' : '确认导入并重建阵容'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function EditableField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#7290a0"
      />
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const accent = percent >= 95 ? '#84d4a2' : percent >= 88 ? '#ffd98c' : '#ff9f86';

  return (
    <View style={[styles.badge, { borderColor: accent }]}>
      <Text style={[styles.badgeText, { color: accent }]}>{percent}%</Text>
    </View>
  );
}

function MetricCard({
  label,
  value,
  accent = '#d8eee1',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: {
    color: '#8bd0a7',
    fontWeight: '700',
    fontSize: 14,
  },
  kicker: {
    color: '#8bd0a7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f5f8f9',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a9bcc5',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#d8eee1',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryLabel: {
    color: '#56715e',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#173526',
    fontSize: 16,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#102330',
    borderRadius: 20,
    padding: 16,
  },
  metricLabel: {
    color: '#8cb0c3',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  warningCard: {
    backgroundColor: '#3b2a13',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#8f6230',
  },
  warningTitle: {
    color: '#ffd98c',
    fontSize: 16,
    fontWeight: '800',
  },
  warningText: {
    color: '#ffe8b8',
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: '#0f1d28',
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: '#eef7f6',
    fontSize: 18,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#102330',
  },
  previewHint: {
    color: '#97b4c2',
    fontSize: 13,
  },
  rawText: {
    color: '#d7e5ea',
    fontSize: 13,
    lineHeight: 19,
  },
  tableCard: {
    backgroundColor: '#0f1d28',
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  rowCard: {
    backgroundColor: '#112636',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  rowTitle: {
    color: '#f2f7f8',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#8cb0c3',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#274255',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f5fafb',
    backgroundColor: '#0c1e2b',
  },
  confirmButton: {
    backgroundColor: '#8bd0a7',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.65,
  },
  confirmButtonText: {
    color: '#0f231d',
    fontWeight: '800',
    fontSize: 15,
  },
});
