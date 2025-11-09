import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { baseStyles, loginStyles } from "../styles/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:
      "93116964233-2nn1m34uj3j4hd5r0j2skda5m9m8tbq1.apps.googleusercontent.com",
    iosClientId:
      "93116964233-i8dt8gathqh7ddbnhqq8u9jr6i827urm.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
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
    <View style={baseStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient effect */}
      <View style={baseStyles.backgroundGradient}>
        <View style={[baseStyles.circle, baseStyles.circle1]} />
        <View style={[baseStyles.circle, baseStyles.circle2]} />
        <View style={[baseStyles.circle, baseStyles.circle3]} />
      </View>

      <Animated.View
        style={[
          baseStyles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Section */}
        <View style={loginStyles.logoContainer}>
          <View style={loginStyles.logoCircle}>
            <Text style={loginStyles.logoLeaf}>🌱</Text>
          </View>
          <Text style={loginStyles.logoText}>
            <Text style={loginStyles.logoEco}>Eco</Text>
            <Text style={loginStyles.logoScore}>Score</Text>
          </Text>
        </View>

        {/* Tagline */}
        <Text style={loginStyles.tagline}>
          Track Your Impact,{"\n"}Earn Real Rewards
        </Text>

        {/* Description */}
        <Text style={loginStyles.description}>
          Convert your eco-friendly actions into cashback and discounts at your
          favorite stores
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[
            loginStyles.signInButton,
            !request && loginStyles.signInButtonDisabled,
          ]}
          // onPress={() => promptAsync()}
          onPress={() => navigation.navigate("Home")}
          disabled={!request}
          activeOpacity={0.8}
        >
          <View style={loginStyles.googleIcon}>
            <Text style={loginStyles.googleG}>G</Text>
          </View>
          <Text style={loginStyles.signInButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* Footer Text */}
        <Text style={loginStyles.footerText}>
          Start making a difference today
        </Text>
      </Animated.View>
    </View>
  );
}
