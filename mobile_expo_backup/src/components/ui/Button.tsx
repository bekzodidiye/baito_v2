import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-200 text-gray-800';
      case 'outline':
        return 'border border-blue-600 bg-transparent text-blue-600';
      case 'danger':
        return 'bg-red-600 text-white';
      case 'primary':
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'text-gray-800';
      case 'outline':
        return 'text-blue-600';
      case 'danger':
        return 'text-white';
      case 'primary':
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-4 rounded-md';
      case 'lg':
        return 'py-4 px-8 rounded-xl';
      case 'md':
      default:
        return 'py-3 px-6 rounded-lg';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      case 'md':
      default:
        return 'text-base';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'secondary' ? '#2563eb' : '#ffffff'} />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`font-semibold ${getTextVariantStyles()} ${getTextSizeStyles()}`}>
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
