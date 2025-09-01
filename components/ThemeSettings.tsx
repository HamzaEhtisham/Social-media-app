import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { getColors } from '@/constants/theme';

interface ThemeSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function ThemeSettings({ visible, onClose }: ThemeSettingsProps) {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const colors = getColors(isDark);

  const themeOptions = [
    {
      id: 'light' as const,
      label: 'Light',
      icon: 'sunny-outline',
      description: 'Light theme',
    },
    {
      id: 'dark' as const,
      label: 'Dark',
      icon: 'moon-outline',
      description: 'Dark theme',
    },
    {
      id: 'system' as const,
      label: 'System',
      icon: 'phone-portrait-outline',
      description: 'Follow system settings',
    },
  ];

  const handleThemeSelect = (selectedTheme: 'light' | 'dark' | 'system') => {
    setTheme(selectedTheme);
    Alert.alert('Theme Updated', `Switched to ${selectedTheme} theme`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Theme Settings
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Toggle */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Toggle
          </Text>
          <TouchableOpacity
            style={[styles.quickToggle, { backgroundColor: colors.surface }]}
            onPress={toggleTheme}
          >
            <View style={styles.toggleContent}>
              <Ionicons 
                name={isDark ? 'moon' : 'sunny'} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Switch to {isDark ? 'Light' : 'Dark'} Mode
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Theme Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Theme Options
          </Text>
          
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.themeOption,
                { backgroundColor: colors.surface },
                theme === option.id && { 
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                  borderWidth: 2,
                }
              ]}
              onPress={() => handleThemeSelect(option.id)}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={theme === option.id ? colors.primary : colors.textSecondary} 
                />
                <View style={styles.optionText}>
                  <Text style={[
                    styles.optionLabel, 
                    { color: theme === option.id ? colors.primary : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>
              
              {theme === option.id && (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={colors.primary} 
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preview
          </Text>
          <View style={[styles.preview, { backgroundColor: colors.surface }]}>
            <View style={styles.previewPost}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewAvatar, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={[styles.previewUsername, { color: colors.text }]}>
                    username
                  </Text>
                  <Text style={[styles.previewTime, { color: colors.textSecondary }]}>
                    2 minutes ago
                  </Text>
                </View>
              </View>
              <Text style={[styles.previewCaption, { color: colors.text }]}>
                This is how your posts will look in {isDark ? 'dark' : 'light'} mode! 🎨
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  preview: {
    borderRadius: 12,
    padding: 16,
  },
  previewPost: {
    paddingVertical: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  previewUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewTime: {
    fontSize: 12,
    marginTop: 2,
  },
  previewCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
});
