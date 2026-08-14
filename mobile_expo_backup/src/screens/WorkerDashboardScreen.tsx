import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Card } from '../components/ui/Card';

export default function WorkerDashboardScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900">Xush kelibsiz!</Text>
        <Text className="text-gray-500">Bugungi kun uchun yangi ishlar bilan tanishing</Text>
      </View>

      <Text className="text-lg font-semibold text-gray-800 mb-3">Statistika</Text>
      <View className="flex-row flex-wrap justify-between">
        <Card className="w-[48%]">
          <Text className="text-gray-500 text-sm">Arizalar</Text>
          <Text className="text-2xl font-bold text-blue-600">3</Text>
        </Card>
        <Card className="w-[48%]">
          <Text className="text-gray-500 text-sm">Saqlangan</Text>
          <Text className="text-2xl font-bold text-blue-600">5</Text>
        </Card>
      </View>

      <Text className="text-lg font-semibold text-gray-800 mb-3 mt-4">Sizga mos ishlar</Text>
      <Card>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-base font-bold text-gray-900 flex-1">Farrosh kerak</Text>
          <Text className="text-green-600 font-semibold">100k - 150k so'm</Text>
        </View>
        <Text className="text-sm text-gray-500 mb-4">Mirobod tumani, Toshkent • Bugun, 14:00</Text>
        
        <View className="flex-row items-center">
          <View className="bg-gray-100 rounded-md px-2 py-1 mr-2">
            <Text className="text-xs text-gray-600">Tozalash</Text>
          </View>
        </View>
      </Card>
      
      <Card>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-base font-bold text-gray-900 flex-1">Yuk tashuvchi</Text>
          <Text className="text-green-600 font-semibold">80k so'm</Text>
        </View>
        <Text className="text-sm text-gray-500 mb-4">Chilonzor tumani, Toshkent • Ertaga, 09:00</Text>
        
        <View className="flex-row items-center">
          <View className="bg-gray-100 rounded-md px-2 py-1 mr-2">
            <Text className="text-xs text-gray-600">Yuk tashish</Text>
          </View>
        </View>
      </Card>

    </ScrollView>
  );
}
