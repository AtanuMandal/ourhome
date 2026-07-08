import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { formatCurrency } from '../utils/currency';
import { colors } from '../../theme/colors';

interface CurrencyTextProps {
  amount: number;
  style?: TextStyle;
}

export function CurrencyText({ amount, style }: CurrencyTextProps) {
  return (
    <Text style={[{ color: colors.text.primary }, style]}>
      {formatCurrency(amount)}
    </Text>
  );
}
