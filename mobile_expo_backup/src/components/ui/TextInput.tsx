import React from 'react';
import { TextInput as RNTextInput, TextInputProps, View, Text } from 'react-native';

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput: React.FC<CustomTextInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <View className={`mb-4 ${className}`}>
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      
      <View className={`flex-row items-center border ${error ? 'border-red-500' : 'border-gray-300'} bg-white rounded-lg px-3 py-3`}>
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        
        <RNTextInput
          className="flex-1 text-base text-gray-900"
          placeholderTextColor="#9ca3af"
          {...props}
        />
        
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
};
