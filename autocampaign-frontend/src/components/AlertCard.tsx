import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface AlertCardProps {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export const AlertCard: React.FC<AlertCardProps> = ({ title, description, severity }) => {
  const config = {
    high:   { color: Colors.error,   icon: 'alert-circle'     as const, bg: 'rgba(255,69,58,0.10)'  },
    medium: { color: Colors.warning,  icon: 'warning'          as const, bg: 'rgba(255,159,10,0.10)' },
    low:    { color: Colors.success,  icon: 'information-circle' as const, bg: 'rgba(48,209,88,0.10)' },
  };
  const { color, icon, bg } = config[severity];

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: color + '30' }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
