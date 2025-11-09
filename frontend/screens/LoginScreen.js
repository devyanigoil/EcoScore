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
import { useNavigation } from "@react-navigation/native";
import { oceanSunsetNeumorphicStyles as styles } from "../colorThemes";
// import { oceanSunsetStyles as styles } from "./colorThemes";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation = useNavigation();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:
      "93116964233-2nn1m34uj3j4hd5r0j2skda5m9m8tbq1.apps.googleusercontent.com",
    iosClientId:
      "93116964233-i8dt8gathqh7ddbnhqq8u9jr6i827urm.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (fontsLoaded) {
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
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (response) {
      console.log("Auth Response:", response);

      if (response.type === "error") {
        console.log("Auth Error:", response.error);
      }
      if (response?.type === "success") {
        const { authentication } = response;
        const idToken = authentication.idToken;
        const accessToken = authentication.accessToken;

        console.log("ID Token:", idToken);
        console.log("Access Token:", accessToken);

        // Send ID token to FastAPI backend
        axios
          .post("http://127.0.0.1:8000/auth/google", {
            id_token: idToken,
            access_token: accessToken,
          })
          .then((res) => console.log("Backend JWT + Gmail Labels:", res.data))
          .catch((err) => console.log(err.response?.data || err));
      }
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

        {/* <View style={styles.featuresContainer}>
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
        </View> */}

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, !request && styles.signInButtonDisabled]}
          // onPress={() => promptAsync()}
          onPress={() => navigation.navigate("Home")}
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
