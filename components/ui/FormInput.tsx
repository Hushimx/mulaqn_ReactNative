import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { I18nManager } from 'react-native';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  labelStyle?: TextStyle;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  error?: string;
  errorStyle?: TextStyle;
  showPasswordToggle?: boolean;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export function FormInput({
  label,
  labelStyle,
  containerStyle,
  inputStyle,
  error,
  errorStyle,
  showPasswordToggle = false,
  rightIcon,
  leftIcon,
  secureTextEntry,
  ...textInputProps
}: FormInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry && showPasswordToggle;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={styles.inputWrapper}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (isPassword || rightIcon) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          secureTextEntry={isPassword && !isPasswordVisible}
          placeholderTextColor="#8C8C8C"
        />
        
        {(isPassword || rightIcon) && (
          <View style={styles.rightIconContainer}>
            {isPassword ? (
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(prev => !prev)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            ) : (
              rightIcon
            )}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  inputWithLeftIcon: {
    paddingLeft: 48,
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    padding: 4,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  iconButton: {
    padding: 4,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
});

