import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import WorkerDashboardScreen from '../screens/WorkerDashboardScreen';
import WorkerJobsScreen from '../screens/WorkerJobsScreen';
import WorkerApplicationsScreen from '../screens/WorkerApplicationsScreen';
import WorkerProfileScreen from '../screens/WorkerProfileScreen';
import WorkerChatsScreen from '../screens/WorkerChatsScreen';

const Tab = createBottomTabNavigator();

export default function WorkerTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help';

          if (route.name === 'Asosiy') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Ishlar') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Arizalar') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Xabarlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb', // blue-600
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Asosiy" component={WorkerDashboardScreen} />
      <Tab.Screen name="Ishlar" component={WorkerJobsScreen} />
      <Tab.Screen name="Arizalar" component={WorkerApplicationsScreen} />
      <Tab.Screen name="Xabarlar" component={WorkerChatsScreen} />
      <Tab.Screen name="Profil" component={WorkerProfileScreen} />
    </Tab.Navigator>
  );
}
