import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, Text, Alert } from "react-native";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import Shopping from "./screens/Shopping";
import Transportation from "./screens/Transportation";
import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerTintColor: "#ffffff",
          headerStyle: { backgroundColor: "#003d5b" },
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
                        onPress: () => navigation.replace("Login"),
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
