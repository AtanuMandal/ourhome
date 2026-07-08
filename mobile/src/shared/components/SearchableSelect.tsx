import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: SearchableSelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(optionValue: string): void {
    onChange(optionValue);
    setModalVisible(false);
    setSearch('');
  }

  function handleClose(): void {
    setModalVisible(false);
    setSearch('');
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={placeholder}
      >
        <Text style={selected != null ? styles.selectedText : styles.placeholder}>
          {selected != null ? selected.label : placeholder}
        </Text>
        <Text style={styles.arrow}>{'v'}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={colors.text.disabled}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  placeholder: { color: colors.text.disabled, fontSize: typography.fontSize.base },
  selectedText: { color: colors.text.primary, fontSize: typography.fontSize.base },
  arrow: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  option: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: typography.fontSize.base, color: colors.text.primary },
  closeButton: { marginTop: spacing.sm, alignItems: 'center', padding: spacing.sm },
  closeText: { color: colors.primary, fontWeight: typography.fontWeight.medium },
});
