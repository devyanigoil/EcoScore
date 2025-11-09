import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { baseStyles, homeStyles, COLORS } from "../styles/theme";

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.logoText}>
          <Text style={styles.logoEco}>Eco</Text>
          <Text style={styles.logoScore}>Score</Text>
        </Text>
      </Animated.View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.textContainer}>
          <Text style={styles.measureText}>know</Text>
          <Text style={styles.measureText}>your</Text>
          <Text style={styles.measureText}>impact</Text>

          <View style={styles.spacing} />

          <Text style={styles.reduceText}>reduce</Text>
          <Text style={styles.reduceText}>your</Text>
          <Text style={styles.reduceText}>footprint</Text>
        </View>
      </Animated.View>

      {/* CTA Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.readyButton}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>I'm Ready</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "flex-start",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: -1,
  },
  logoEco: {
    color: COLORS.primary,
    fontWeight: "400",
  },
  logoScore: {
    color: "#ffffff",
    fontWeight: "300",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    marginTop: -40,
  },
  textContainer: {
    alignItems: "flex-start",
  },
  measureText: {
    fontSize: 72,
    fontWeight: "300",
    color: "#ffffff",
    lineHeight: 72,
    letterSpacing: -2,
  },
  spacing: {
    height: 20,
  },
  reduceText: {
    fontSize: 72,
    fontWeight: "300",
    color: COLORS.primary,
    lineHeight: 72,
    letterSpacing: -2,
  },
  buttonContainer: {
    width: "100%",
  },
  readyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "600",
  },
});
