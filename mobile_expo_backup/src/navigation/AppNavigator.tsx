import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WorkerTabsNavigator from './WorkerTabsNavigator';
import EmployerDashboardScreen from '../screens/EmployerDashboardScreen';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '../components/ui/Loader';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isInitialized, isLoggedIn, userProfile, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized) {
    return <Loader fullScreen message="Ilova yuklanmoqda..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main Stack based on role
          userProfile?.role === 'employer' ? (
            <Stack.Screen name="EmployerDashboard" component={EmployerDashboardScreen} />
          ) : (
            <Stack.Screen name="WorkerTabs" component={WorkerTabsNavigator} />
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
