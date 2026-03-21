import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import type { WeeklyPerformancePoint } from '../types/portfolio';

type WeeklyPerformanceCardProps = {
  points: WeeklyPerformancePoint[];
  updatedAt: string | null;
};

const SERIES = [
  { key: 'portfolio', label: '组合净值', color: '#f5d787' },
  { key: 'shanghai', label: '上证指数', color: '#8dd3b0' },
  { key: 'csi300', label: '沪深300', color: '#8fbff0' },
] as const;

export function WeeklyPerformanceCard({ points, updatedAt }: WeeklyPerformanceCardProps) {
  const [chartWidth, setChartWidth] = useState(0);

  const chartData = useMemo(() => {
    if (!points.length || chartWidth <= 0) {
      return null;
    }

    const values = points.flatMap((point) => [point.portfolio, point.shanghai, point.csi300]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const height = 176;
    const usableWidth = Math.max(chartWidth - 8, 1);

    return {
      min,
      max,
      height,
      series: SERIES.map((series) => ({
        ...series,
        points: points.map((point, index) => ({
          x: points.length === 1 ? usableWidth / 2 : (usableWidth / (points.length - 1)) * index + 4,
          y:
            8 +
            ((max - point[series.key]) / range) * (height - 20),
          value: point[series.key],
          label: point.label.slice(5),
        })),
      })),
    };
  }, [chartWidth, points]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Weekly Form</Text>
          <Text style={styles.title}>每周净值对比</Text>
        </View>
        {updatedAt ? <Text style={styles.updatedAt}>更新于 {updatedAt}</Text> : null}
      </View>

      <View style={styles.legend}>
        {SERIES.map((series) => (
          <View key={series.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: series.color }]} />
            <Text style={styles.legendText}>{series.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartShell} onLayout={(event: LayoutChangeEvent) => setChartWidth(event.nativeEvent.layout.width)}>
        {chartData ? (
          <View style={[styles.chartStage, { height: chartData.height }]}>
            {chartData.series.map((series) => (
              <View key={series.key} style={StyleSheet.absoluteFill}>
                {series.points.slice(0, -1).map((point, index) => {
                  const next = series.points[index + 1];
                  const dx = next.x - point.x;
                  const dy = next.y - point.y;
                  const length = Math.hypot(dx, dy);
                  const angle = `${Math.atan2(dy, dx)}rad`;

                  return (
                    <View
                      key={`${series.key}-${index}`}
                      style={[
                        styles.segment,
                        {
                          left: point.x,
                          top: point.y,
                          width: length,
                          backgroundColor: series.color,
                          transform: [{ rotate: angle }],
                        },
                      ]}
                    />
                  );
                })}
                {series.points.map((point, index) => (
                  <View
                    key={`${series.key}-point-${index}`}
                    style={[
                      styles.dot,
                      {
                        left: point.x - 4,
                        top: point.y - 4,
                        backgroundColor: series.color,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.labels}>
        {points.map((point) => (
          <Text key={point.label} style={styles.axisLabel}>
            {point.label.slice(5)}
          </Text>
        ))}
      </View>

      {points.length ? (
        <View style={styles.footer}>
          <Metric label="组合" value={points[points.length - 1].portfolio} />
          <Metric label="上证" value={points[points.length - 1].shanghai} />
          <Metric label="沪深300" value={points[points.length - 1].csi300} />
        </View>
      ) : (
        <Text style={styles.empty}>暂无周度走势数据。</Text>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0e2130',
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    color: '#8fb2c3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#eef8fb',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  updatedAt: {
    color: '#88a6b6',
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#dce8ed',
    fontSize: 13,
    fontWeight: '700',
  },
  chartShell: {
    minHeight: 176,
    justifyContent: 'center',
  },
  chartStage: {
    position: 'relative',
  },
  segment: {
    position: 'absolute',
    height: 2,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  axisLabel: {
    color: '#7fa2b4',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    backgroundColor: '#143041',
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  metricLabel: {
    color: '#88a7b9',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: '#f3fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  empty: {
    color: '#88a6b6',
    fontSize: 14,
    lineHeight: 20,
  },
});
