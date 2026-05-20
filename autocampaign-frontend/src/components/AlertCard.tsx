import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface AlertCardProps {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export const AlertCard: React.FC<AlertCardProps> = ({ title, description, severity }) => {
  const T = useTheme();
  const config = {
    high:   { color: T.error,   icon: 'alert-circle'     as const, bg: `${T.error}12`  },
    medium: { color: T.warning,  icon: 'warning'          as const, bg: `${T.warning}12` },
    low:    { color: T.success,  icon: 'information-circle' as const, bg: `${T.success}12` },
  };
  const { color, icon, bg } = config[severity];

  return (
    <View style={[styles.container, T.card, T.shadow, { backgroundColor: bg, borderColor: `${color}30` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: T.text }]}>{title}</Text>
        <Text style={[styles.description, { color: T.textSub }]}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
});
