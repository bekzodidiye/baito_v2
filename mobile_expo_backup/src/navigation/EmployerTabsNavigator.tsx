import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import EmployerDashboardScreen from '../screens/EmployerDashboardScreen';
import EmployerJobsScreen from '../screens/EmployerJobsScreen';
import EmployerChatsScreen from '../screens/EmployerChatsScreen';
import EmployerProfileScreen from '../screens/EmployerProfileScreen';

const Tab = createBottomTabNavigator();

export default function EmployerTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help';

          if (route.name === 'Asosiy') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'E\'lonlar') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Xabarlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a', // green-600
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Asosiy" component={EmployerDashboardScreen} />
      <Tab.Screen name="E'lonlar" component={EmployerJobsScreen} />
      <Tab.Screen name="Xabarlar" component={EmployerChatsScreen} />
      <Tab.Screen name="Profil" component={EmployerProfileScreen} />
    </Tab.Navigator>
  );
}
