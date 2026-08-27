import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: TouchableOpacityProps['onPress'];
}

export const Card: React.FC<CardProps> = ({ children, className = '', onPress, ...props }) => {
  const cardStyles = `bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4 ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} className={cardStyles} {...(props as TouchableOpacityProps)}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={cardStyles} {...props}>
      {children}
    </View>
  );
};
