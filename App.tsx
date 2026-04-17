import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./src/screens/HomeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GameScreen from "./src/screens/GameScreen";
import CategoryScreen from "./src/screens/CategoryScreen";
import HowToPlayScreen from "./src/screens/HowToPlayScreen";
import AchievementsScreen from "./src/screens/AchievementsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LeaderboardScreen from "./src/screens/LeaderboardScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("dagarcik_onboarded").then(val => {
      setOnboarded(val === "true");
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6F2" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {!onboarded && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
