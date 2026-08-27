import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { loginApi } from '../api/queries';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const { setIsLoggedIn, setUserProfile } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: () => loginApi(phone, password),
    onSuccess: (data) => {
      // Assuming data returns user profile and access token
      setUserProfile(data);
      setIsLoggedIn(true);
      // navigation will be handled by the navigator switching to MainStack once isLoggedIn is true
    },
    onError: (error: any) => {
      Alert.alert('Xato', error.message || 'Login qilishda xatolik yuz berdi');
    }
  });

  const handleLogin = () => {
    if (!phone || !password) {
      Alert.alert('Xato', 'Iltimos, telefon raqam va parolni kiriting');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900 text-center mb-2">Xush kelibsiz</Text>
          <Text className="text-base text-gray-500 text-center">Tizimga kirish uchun ma'lumotlarni kiriting</Text>
        </View>

        <TextInput
          label="Telefon raqam"
          placeholder="+998901234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
        />

        <TextInput
          label="Parol"
          placeholder="Parolingizni kiriting"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View className="mt-6">
          <Button 
            title="Tizimga kirish" 
            onPress={handleLogin} 
            isLoading={loginMutation.isPending} 
            variant="primary" 
          />
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-gray-600">Hisobingiz yo'qmi? </Text>
          <Text 
            className="text-blue-600 font-semibold"
            onPress={() => navigation.navigate('Register')}
          >
            Ro'yxatdan o'tish
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
