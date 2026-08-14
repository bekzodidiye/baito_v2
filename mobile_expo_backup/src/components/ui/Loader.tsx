import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ message = 'Yuklanmoqda...', fullScreen = false }) => {
  const content = (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size="large" color="#2563eb" />
      {message && <Text className="mt-4 text-gray-600 text-sm">{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        {content}
      </View>
    );
  }

  return content;
};
