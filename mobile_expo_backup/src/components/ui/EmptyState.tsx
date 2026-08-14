import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  return (
    <View className="flex-1 items-center justify-center p-6 bg-gray-50 rounded-xl my-4">
      {icon && <View className="mb-4">{icon}</View>}
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">{title}</Text>
      {description && <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>}
      {action && <View>{action}</View>}
    </View>
  );
};
