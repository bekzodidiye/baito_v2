import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { registerApi } from '../api/queries';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';

export default function RegisterScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    password: '',
    role: 'worker', // default
  });

  const registerMutation = useMutation({
    mutationFn: () => registerApi(formData),
    onSuccess: () => {
      Alert.alert('Muvaffaqiyatli', "Ro'yxatdan o'tdingiz. Iltimos, tizimga kiring.");
      navigation.navigate('Login');
    },
    onError: (error: any) => {
      Alert.alert('Xato', error.message || "Ro'yxatdan o'tishda xatolik");
    }
  });

  const handleRegister = () => {
    if (!formData.full_name || !formData.phone_number || !formData.password) {
      Alert.alert('Xato', "Barcha maydonlarni to'ldiring");
      return;
    }
    registerMutation.mutate();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900 text-center mb-2">Ro'yxatdan o'tish</Text>
          <Text className="text-base text-gray-500 text-center">Yangi hisob yaratish uchun ma'lumotlarni kiriting</Text>
        </View>

        <TextInput
          label="Ism familiya"
          placeholder="To'liq ismingiz"
          value={formData.full_name}
          onChangeText={(text) => setFormData({ ...formData, full_name: text })}
        />

        <TextInput
          label="Telefon raqam"
          placeholder="+998901234567"
          keyboardType="phone-pad"
          value={formData.phone_number}
          onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
          autoCapitalize="none"
        />

        <TextInput
          label="Parol"
          placeholder="Parolingizni kiriting"
          secureTextEntry
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
        />

        <View className="mt-2 mb-6 flex-row justify-between">
          <Button 
            title="Ishchi" 
            variant={formData.role === 'worker' ? 'primary' : 'outline'} 
            onPress={() => setFormData({ ...formData, role: 'worker' })}
            className="flex-1 mr-2"
          />
          <Button 
            title="Ish beruvchi" 
            variant={formData.role === 'employer' ? 'primary' : 'outline'} 
            onPress={() => setFormData({ ...formData, role: 'employer' })}
            className="flex-1 ml-2"
          />
        </View>

        <Button 
          title="Ro'yxatdan o'tish" 
          onPress={handleRegister} 
          isLoading={registerMutation.isPending} 
          variant="primary" 
        />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-gray-600">Hisobingiz bormi? </Text>
          <Text 
            className="text-blue-600 font-semibold"
            onPress={() => navigation.navigate('Login')}
          >
            Tizimga kirish
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
