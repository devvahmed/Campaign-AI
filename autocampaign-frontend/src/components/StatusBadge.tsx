import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface StatusBadgeProps {
  label: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type }) => {
  const config = {
    success: { bg: 'rgba(48,209,88,0.15)',  color: Colors.success },
    warning: { bg: 'rgba(255,159,10,0.15)', color: Colors.warning },
    error:   { bg: 'rgba(255,69,58,0.15)',  color: Colors.error },
    info:    { bg: 'rgba(10,132,255,0.15)', color: Colors.primary },
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
