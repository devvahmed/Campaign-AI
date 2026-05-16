import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { useCampaignStore } from '../store/campaignStore';
import { getTrace } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const agentConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Data:      { color: Colors.primary,  bg: 'rgba(10,132,255,0.15)',  icon: 'analytics-outline'  },
  Strategy:  { color: Colors.warning,  bg: 'rgba(255,159,10,0.15)',  icon: 'bulb-outline'       },
  Creative:  { color: Colors.success,  bg: 'rgba(48,209,88,0.15)',   icon: 'color-palette-outline' },
  Execution: { color: Colors.purple,   bg: 'rgba(191,90,242,0.15)',  icon: 'rocket-outline'     },
};

const getConfig = (agentName: string) => {
  for (const key of Object.keys(agentConfig)) {
    if (agentName?.includes(key)) return agentConfig[key];
  }
  return { color: Colors.textSecondary, bg: Colors.surfaceHigh, icon: 'terminal-outline' };
};

export const TraceScreen = () => {
  const { jobId } = useCampaignStore();
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
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="terminal-outline" size={36} color={Colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>No Active Job</Text>
        <Text style={styles.emptySub}>Start an analysis to see live agent traces.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Agent Log</Text>
          <Text style={styles.jobId} numberOfLines={1}>Job: {jobId}</Text>
        </View>
        {loading && <ActivityIndicator color={Colors.primary} size="small" />}
      </View>

      {traceLog.length === 0 ? (
        <View style={styles.waitBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.waitText}>Waiting for agent activity...</Text>
        </View>
      ) : (
        traceLog.map((log: any, index: number) => {
          const cfg = getConfig(log.agent);
          return (
            <View key={index} style={styles.traceCard}>
              {/* Agent Header */}
              <View style={styles.cardHead}>
                <View style={[styles.agentBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[styles.agentName, { color: cfg.color }]}>{log.agent}</Text>
                </View>
                <View style={styles.latencyBadge}>
                  <Text style={styles.latencyText}>{log.latency_ms}ms</Text>
                </View>
              </View>

              {/* Confidence Bar */}
              <View style={styles.confRow}>
                <Text style={styles.fieldLabel}>Confidence</Text>
                <View style={styles.confBar}>
                  <View style={[styles.confFill, {
                    width: `${log.confidence * 100}%` as any,
                    backgroundColor: log.confidence > 0.8 ? Colors.success : Colors.warning
                  }]} />
                </View>
                <Text style={[styles.confPct, { color: log.confidence > 0.8 ? Colors.success : Colors.warning }]}>
                  {Math.round(log.confidence * 100)}%
                </Text>
              </View>

              {/* Fields */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>WORKPLAN</Text>
                <Text style={styles.fieldText}>{log.workplan}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TOOLS</Text>
                <View style={styles.toolsBox}>
                  {log.tool_calls?.map((t: string, i: number) => (
                    <Text key={i} style={styles.toolCode}>{t}</Text>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>REASONING</Text>
                <Text style={styles.fieldText}>{log.reasoning}</Text>
              </View>
              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>DECISION</Text>
                <Text style={[styles.fieldText, { color: cfg.color, fontWeight: '600' }]}>{log.decision}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

  emptyContainer: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.surfaceHigh, justifyContent: 'center',
    alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  jobId: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'monospace', marginTop: 2 },

  waitBox: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: Colors.surfaceHigh, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  waitText: { color: Colors.textSecondary, fontSize: 14 },

  traceCard: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 12,
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
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  latencyText: { color: Colors.textSecondary, fontSize: 12 },

  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  confBar: {
    flex: 1, height: 5, backgroundColor: Colors.borderLight,
    borderRadius: 3, overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: 3 },
  confPct: { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textTertiary,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  fieldText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 19 },
  toolsBox: {
    backgroundColor: Colors.background, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  toolCode: { color: Colors.success, fontFamily: 'monospace', fontSize: 12, marginBottom: 2 },
});
