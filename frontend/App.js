import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import axios from "axios";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

export default function App() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "",
    webClientId: "",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      const accessToken = authentication.accessToken;
      const idToken = authentication.idToken;
      console.log("Access Token:", accessToken);
      console.log("ID Token:", idToken);
      axios
        .post("http://YOUR_SERVER_IP:8000/auth/google", {
          id_token: idToken,
          access_token: accessToken,
        })
        .then((res) => console.log("API Token:", res.data.token))
        .catch((err) => console.log(err.response?.data || err));
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient effect */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLeaf}>🌱</Text>
          </View>
          <Text style={styles.logoText}>
            <Text style={styles.logoEco}>Eco</Text>
            <Text style={styles.logoScore}>Score</Text>
          </Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Track Your Impact,{"\n"}Earn Real Rewards
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Convert your eco-friendly actions into cashback and discounts at your
          favorite stores
        </Text>

        {/* Feature Pills */}
        <View style={styles.featuresContainer}>
          <View style={styles.featurePill}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>Track Carbon</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>Earn Cashback</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featureIcon}>🎁</Text>
            <Text style={styles.featureText}>Get Rewards</Text>
          </View>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, !request && styles.signInButtonDisabled]}
          onPress={() => promptAsync()}
          disabled={!request}
          activeOpacity={0.8}
        >
          <View style={styles.googleIcon}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.signInButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* Footer Text */}
        <Text style={styles.footerText}>Start making a difference today</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a1f1a",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundGradient: {
    position: "absolute",
    width: width,
    height: height,
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 1000,
    opacity: 0.1,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: "#10b981",
    top: -100,
    left: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: "#34d399",
    bottom: -50,
    right: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: "#6ee7b7",
    top: height * 0.4,
    right: width * 0.2,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 30,
    width: "100%",
    maxWidth: 500,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  logoLeaf: {
    fontSize: 40,
  },
  logoText: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoEco: {
    fontSize: 48,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: -1,
  },
  logoScore: {
    fontSize: 48,
    fontWeight: "300",
    color: "#ffffff",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 28,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 50,
    gap: 10,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginHorizontal: 5,
    marginVertical: 5,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  featureText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleG: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  signInButtonText: {
    color: "#0a1f1a",
    fontSize: 17,
    fontWeight: "600",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    textAlign: "center",
  },
});
