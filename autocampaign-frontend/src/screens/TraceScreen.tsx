import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useCampaignStore } from '../store/campaignStore';
import { getTrace } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

const getAgentConfig = (agentName: string, T: any) => {
  const agentConfig: Record<string, { color: string; bg: string; icon: any }> = {
    Data:      { color: T.primary,  bg: `${T.primary}18`,  icon: 'analytics-outline'  },
    Strategy:  { color: T.warning,  bg: `${T.warning}18`,  icon: 'bulb-outline'       },
    Creative:  { color: T.success,  bg: `${T.success}18`,  icon: 'color-palette-outline' },
    Execution: { color: T.purple,   bg: `${T.purple}18`,   icon: 'rocket-outline'     },
  };

  for (const key of Object.keys(agentConfig)) {
    if (agentName?.includes(key)) return agentConfig[key];
  }
  return { color: T.textSub, bg: T.surfaceCard, icon: 'terminal-outline' };
};

export const TraceScreen = () => {
  const { jobId } = useCampaignStore();
  const T = useTheme();
  const [traceLog, setTraceLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchTrace = async () => {
      if (!jobId) return;
      try {
        const res = await getTrace(jobId);
        if (res.trace) setTraceLog(res.trace);
      } catch {}
    };
    if (jobId) {
      setLoading(true);
      fetchTrace().finally(() => setLoading(false));
      interval = setInterval(fetchTrace, 3000);
    }
    return () => clearInterval(interval);
  }, [jobId]);

  if (!jobId) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: T.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: T.surfaceCard }]}>
          <Ionicons name="terminal-outline" size={36} color={T.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: T.text }]}>No Active Job</Text>
        <Text style={[styles.emptySub, { color: T.textSub }]}>Start an analysis to see live agent traces.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: T.text }]}>Agent Log</Text>
          <Text style={[styles.jobId, { color: T.textSub }]} numberOfLines={1}>Job: {jobId}</Text>
        </View>
        {loading && <ActivityIndicator color={T.primary} size="small" />}
      </View>

      {traceLog.length === 0 ? (
        <View style={[styles.waitBox, T.card, T.shadow, { backgroundColor: T.surface }]}>
          <ActivityIndicator color={T.primary} />
          <Text style={[styles.waitText, { color: T.textSub }]}>Waiting for agent activity...</Text>
        </View>
      ) : (
        traceLog.map((log: any, index: number) => {
          const cfg = getAgentConfig(log.agent, T);
          return (
            <View key={index} style={[styles.traceCard, T.cardLg, T.shadow]}>
              {/* Agent Header */}
              <View style={styles.cardHead}>
                <View style={[styles.agentBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[styles.agentName, { color: cfg.color }]}>{log.agent}</Text>
                </View>
                <View style={[styles.latencyBadge, { backgroundColor: T.surfaceCard }]}>
                  <Text style={[styles.latencyText, { color: T.textSub }]}>{log.latency_ms}ms</Text>
                </View>
              </View>

              {/* Confidence Bar */}
              <View style={styles.confRow}>
                <Text style={[styles.fieldLabel, { color: T.textTertiary }]}>Confidence</Text>
                <View style={[styles.confBar, { backgroundColor: T.borderMid }]}>
                  <View style={[styles.confFill, {
                    width: `${log.confidence * 100}%` as any,
                    backgroundColor: log.confidence > 0.8 ? T.success : T.warning
                  }]} />
                </View>
                <Text style={[styles.confPct, { color: log.confidence > 0.8 ? T.success : T.warning }]}>
                  {Math.round(log.confidence * 100)}%
                </Text>
              </View>

              {/* Fields */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.textTertiary }]}>WORKPLAN</Text>
                <Text style={[styles.fieldText, { color: T.text }]}>{log.workplan}</Text>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.textTertiary }]}>TOOLS</Text>
                <View style={[styles.toolsBox, { backgroundColor: T.surfaceCard, borderColor: T.border }]}>
                  {log.tool_calls?.map((t: string, i: number) => (
                    <Text key={i} style={[styles.toolCode, { color: T.success }]}>{t}</Text>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.textTertiary }]}>REASONING</Text>
                <Text style={[styles.fieldText, { color: T.text }]}>{log.reasoning}</Text>
              </View>
              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={[styles.fieldLabel, { color: T.textTertiary }]}>DECISION</Text>
                <Text style={[styles.fieldText, { color: cfg.color, fontWeight: '700' }]}>{log.decision}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center' },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { fontSize: 32, fontWeight: '700' },
  jobId: { fontSize: 12, fontFamily: 'monospace', marginTop: 2 },

  waitBox: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    padding: 16, borderRadius: 24, borderWidth: 0,
  },
  waitText: { fontSize: 14 },

  traceCard: {
    padding: 16, marginBottom: 16, borderWidth: 0,
  },
  cardHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  agentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  agentName: { fontSize: 13, fontWeight: '700' },
  latencyBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  latencyText: { fontSize: 12 },

  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  confBar: {
    flex: 1, height: 6,
    borderRadius: 99, overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: 99 },
  confPct: { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  fieldText: { fontSize: 13, lineHeight: 19 },
  toolsBox: {
    padding: 10, borderRadius: 12,
    borderWidth: 1,
  },
  toolCode: { fontFamily: 'monospace', fontSize: 12, marginBottom: 2 },
});
