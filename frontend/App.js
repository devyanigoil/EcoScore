import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import Shopping from "./screens/Shopping";
import Transportation from "./screens/Transportation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true, // <— show native headers
          headerTitle: "", // clean look; you can set per-screen
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerTintColor: "#ffffff",
          headerStyle: { backgroundColor: "#003d5b" }, // ocean theme
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: "EcoScore",
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="Shopping"
          component={Shopping}
          options={{ headerTitle: "Shopping" }}
        />
        <Stack.Screen
          name="Transportation"
          component={Transportation}
          options={{ headerTitle: "Transportation" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
