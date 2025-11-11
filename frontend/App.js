import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, Alert } from "react-native";
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import Shopping from "./screens/Shopping";
import Transportation from "./screens/Transportation";
import Energy from "./screens/Energy";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "./styles/theme";
import RewardsScreen from "./screens/RewardsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [userId, setUserId] = useState(5);
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerTintColor: "#ffffff",
          headerStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
          initialParams={{ userId }}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerTitle: "EcoScore",
            headerBackVisible: false,
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Logout",
                    "Are you sure you want to log out?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Logout",
                        style: "destructive",
                        onPress: () => navigation.replace("Welcome"),
                      },
                    ],
                    { cancelable: true }
                  );
                }}
                style={{
                  marginRight: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#fff" />
              </TouchableOpacity>
            ),
          })}
          initialParams={{ userId }}
        />

        <Stack.Screen
          name="Shopping"
          component={Shopping}
          options={{ headerTitle: "Shopping" }}
          initialParams={{ userId }}
        />

        <Stack.Screen
          name="Energy"
          component={Energy}
          options={{ headerTitle: "Energy" }}
          initialParams={{ userId }}
        />

        <Stack.Screen
          name="Transportation"
          component={Transportation}
          options={{ headerTitle: "Transportation" }}
          initialParams={{ userId }}
        />
        <Stack.Screen
          name="Rewards"
          component={RewardsScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
