import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './src/theme/colors';
import { Platform } from 'react-native';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { UploadScreen } from './src/screens/UploadScreen';
import { InsightScreen } from './src/screens/InsightScreen';
import { ContradictionScreen } from './src/screens/ContradictionScreen';
import { StrategyScreen } from './src/screens/StrategyScreen';
import { AssetsScreen } from './src/screens/AssetsScreen';
import { ApprovalScreen } from './src/screens/ApprovalScreen';
import { OutcomeScreen } from './src/screens/OutcomeScreen';
import { TraceScreen } from './src/screens/TraceScreen';
import { AppTour } from './src/components/AppTour';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { useUserStore } from './src/store/userStore';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: Colors.surface,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTintColor: Colors.primary,
  headerTitleStyle: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
    fontSize: 17,
  },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: Colors.background },
};

const UploadStack = () => (
  <Stack.Navigator id="upload-stack" screenOptions={stackScreenOptions}>
    <Stack.Screen name="UploadSource" component={UploadScreen} options={{ title: 'Data Sources' }} />
    <Stack.Screen name="Insight" component={InsightScreen} options={{ title: 'Insights' }} />
    <Stack.Screen name="Contradiction" component={ContradictionScreen} options={{ title: 'Conflicts' }} />
    <Stack.Screen name="Strategy" component={StrategyScreen} options={{ title: 'Strategy' }} />
    <Stack.Screen name="Assets" component={AssetsScreen} options={{ title: 'Creative Assets' }} />
    <Stack.Screen name="Approval" component={ApprovalScreen} options={{ title: 'Approval' }} />
    <Stack.Screen name="Outcome" component={OutcomeScreen} options={{ title: 'Campaign Live', headerLeft: () => null }} />
  </Stack.Navigator>
);

const MainTabs = () => {
  const themeColor = useUserStore(state => state.themeColor);
  const activeColor = themeColor();

  return (
    <Tab.Navigator
      id="main-tab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { on: any; off: any }> = {
            Dashboard: { on: 'home', off: 'home-outline' },
            Upload:    { on: 'cloud-upload', off: 'cloud-upload-outline' },
            Trace:     { on: 'terminal', off: 'terminal-outline' },
          };
          const ic = icons[route.name] ?? { on: 'apps', off: 'apps-outline' };
          return <Ionicons name={focused ? ic.on : ic.off} size={size} color={color} />;
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 62,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Upload" component={UploadStack} options={{ title: 'Analyze' }} />
      <Tab.Screen name="Trace" component={TraceScreen} />
    </Tab.Navigator>
  );
};

export default function App() {
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const [showWelcome, setShowWelcome] = useState(true);

  // Step 1: Welcome screen
  if (showWelcome) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }

  // Step 2: Auth screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Step 3: Main app
  return (
    <>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
      <AppTour />
    </>
  );
}
