import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '../components/ui/Card';

export default function EmployerDashboardScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900">Ish beruvchi paneli</Text>
        <Text className="text-gray-500">Kompaniya ko'rsatkichlari va so'nggi ma'lumotlar</Text>
      </View>

      <Text className="text-lg font-semibold text-gray-800 mb-3">Umumiy ko'rsatkichlar</Text>
      <View className="flex-row flex-wrap justify-between">
        <Card className="w-[48%]">
          <Text className="text-gray-500 text-sm">Faol e'lonlar</Text>
          <Text className="text-2xl font-bold text-green-600">12</Text>
        </Card>
        <Card className="w-[48%]">
          <Text className="text-gray-500 text-sm">Arizachilar</Text>
          <Text className="text-2xl font-bold text-green-600">45</Text>
        </Card>
        <Card className="w-[48%] mt-4">
          <Text className="text-gray-500 text-sm">Ko'rishlar</Text>
          <Text className="text-2xl font-bold text-green-600">1.2k</Text>
        </Card>
        <Card className="w-[48%] mt-4">
          <Text className="text-gray-500 text-sm">Suhbatlar</Text>
          <Text className="text-2xl font-bold text-green-600">8</Text>
        </Card>
      </View>

      <Text className="text-lg font-semibold text-gray-800 mb-3 mt-6">So'nggi arizalar</Text>
      <Card>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-base font-bold text-gray-900 flex-1">Ali Valiyev</Text>
          <Text className="text-blue-600 font-semibold">Yangi</Text>
        </View>
        <Text className="text-sm text-gray-500 mb-2">Farrosh pozitsiyasiga</Text>
        <Text className="text-xs text-gray-400">Bugun, 10:30</Text>
      </Card>
    </ScrollView>
  );
}
