import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface AutocompleteTextInputProps {
  value: string;
  onChangeText: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  multiline?: boolean;
  numberOfLines?: number;
}

/**
 * A plain text input with a filtered suggestion dropdown — lets the user pick a previously
 * used value (e.g. visitor company/purpose for this society) or simply keep typing a new one;
 * free text is always accepted, matching the existing behaviour of these fields.
 */
export function AutocompleteTextInput({
  value,
  onChangeText,
  suggestions,
  placeholder,
  style,
  multiline,
  numberOfLines,
}: AutocompleteTextInputProps) {
  const [focused, setFocused] = useState(false);

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()))
    .slice(0, 6);
  const showSuggestions = focused && filtered.length > 0;

  return (
    <View>
      <TextInput
        style={style}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : undefined}
        onFocus={() => setFocused(true)}
        // Delay so a suggestion press registers before the list unmounts on blur.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {showSuggestions && (
        <View style={styles.suggestionBox}>
          {filtered.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionItem}
              onPress={() => {
                onChangeText(suggestion);
                setFocused(false);
              }}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  suggestionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: typography.fontSize.sm, color: colors.text.primary },
});
