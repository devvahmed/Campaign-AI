import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface StatusBadgeProps {
  label: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type }) => {
  const T = useTheme();
  const config = {
    success: { bg: `${T.success}18`,  color: T.success },
    warning: { bg: `${T.warning}18`, color: T.warning },
    error:   { bg: `${T.error}18`,  color: T.error },
    info:    { bg: `${T.primary}18`, color: T.primary },
  };
  const { bg, color } = config[type];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
