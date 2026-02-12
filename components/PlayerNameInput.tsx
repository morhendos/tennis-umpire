import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '@/lib/playerStore';
import { AppColors } from '@/constants/colors';

interface PlayerNameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  colors: AppColors;
  /** Exclude this name from suggestions (the other player's current name) */
  excludeName?: string;
}

export function PlayerNameInput({ 
  value, 
  onChangeText, 
  label, 
  colors: c,
  excludeName,
}: PlayerNameInputProps) {
  const { names, removeName, renameName } = usePlayerStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Filter suggestions: match typed text, exclude other player
  const filtered = names.filter(n => {
    if (excludeName && n.toLowerCase() === excludeName.trim().toLowerCase()) return false;
    if (!value.trim()) return true;
    return n.toLowerCase().includes(value.trim().toLowerCase());
  });

  // Don't show dropdown if current value exactly matches a name (already selected)
  const exactMatch = names.some(n => n.toLowerCase() === value.trim().toLowerCase());
  const shouldShow = showDropdown && filtered.length > 0 && !exactMatch;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [shouldShow]);

  const handleSelect = (name: string) => {
    onChangeText(name);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    setShowDropdown(true);
    setEditingName(null);
  };

  const handleBlur = () => {
    // Small delay so tap on dropdown registers before hiding
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleDelete = (name: string) => {
    Alert.alert(
      'Remove Player',
      `Remove "${name}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            removeName(name);
            if (value === name) onChangeText('');
          },
        },
      ]
    );
  };

  const handleEditStart = (name: string) => {
    setEditingName(name);
    setEditValue(name);
  };

  const handleEditSave = () => {
    if (editingName && editValue.trim()) {
      renameName(editingName, editValue.trim());
      if (value === editingName) onChangeText(editValue.trim());
    }
    setEditingName(null);
  };

  return (
    <View style={styles.container}>
      {/* Text Input */}
      <View style={styles.inputWrapper}>
        <Text style={[styles.inputLabel, { color: c.muted }]}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: c.white }]}
            placeholder="Enter name"
            placeholderTextColor={c.muted}
            value={value}
            onChangeText={(t) => {
              onChangeText(t);
              setShowDropdown(true);
              setEditingName(null);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCapitalize="words"
          />
          {value.length > 0 && (
            <TouchableOpacity 
              style={styles.clearBtn} 
              onPress={() => { onChangeText(''); inputRef.current?.focus(); }}
            >
              <Ionicons name="close-circle" size={18} color={c.muted} />
            </TouchableOpacity>
          )}
          {names.length > 0 && (
            <TouchableOpacity 
              style={styles.dropdownToggle}
              onPress={() => {
                if (showDropdown) {
                  setShowDropdown(false);
                } else {
                  setShowDropdown(true);
                  setEditingName(null);
                  inputRef.current?.focus();
                }
              }}
            >
              <Ionicons 
                name={shouldShow ? 'chevron-up' : 'chevron-down'} 
                size={18} 
                color={c.muted} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dropdown */}
      {shouldShow && (
        <Animated.View 
          style={[
            styles.dropdown, 
            { 
              backgroundColor: c.bgCard, 
              borderColor: c.muted + '30',
              opacity: dropdownAnim,
            },
          ]}
        >
          {filtered.slice(0, 8).map((name) => (
            <View key={name} style={[styles.dropdownItem, { borderBottomColor: c.muted + '15' }]}>
              {editingName === name ? (
                // Edit mode
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { color: c.white, borderColor: c.greenAccent + '50' }]}
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                    autoCapitalize="words"
                    onSubmitEditing={handleEditSave}
                    onBlur={handleEditSave}
                  />
                  <TouchableOpacity onPress={handleEditSave} style={styles.editActionBtn}>
                    <Ionicons name="checkmark" size={18} color={c.greenAccent} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Normal mode
                <TouchableOpacity 
                  style={styles.dropdownNameRow}
                  onPress={() => handleSelect(name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-outline" size={14} color={c.muted} />
                  <Text style={[styles.dropdownName, { color: c.silver }]}>{name}</Text>
                </TouchableOpacity>
              )}
              {editingName !== name && (
                <View style={styles.dropdownActions}>
                  <TouchableOpacity 
                    onPress={() => handleEditStart(name)} 
                    style={styles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={14} color={c.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDelete(name)} 
                    style={styles.actionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={c.muted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  dropdownToggle: {
    padding: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownName: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editActionBtn: {
    padding: 6,
  },
});
