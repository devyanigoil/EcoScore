import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Colors extracted from the palette
const PALETTE = {
  terracotta: "#cbeef3",
  sand: "#E4D3BB",
  seafoam: "#E4EBCC",
  mist: "#9BD0D1",
  teal: "#00296b",
};

export const oceanSunsetNeumorphicStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.teal, // Deep Teal
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
    opacity: 0.15,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: PALETTE.mist, // Mist
    top: -100,
    left: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: PALETTE.sand, // Sand
    bottom: -50,
    right: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: PALETTE.terracotta, // Terracotta
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
    backgroundColor: "rgba(4,155,169,0.20)", // Teal @ 20%
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  logoCircleInner: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(4,155,169,0.30)", // Teal @ 30%
  },
  logoLeaf: {
    fontSize: 40,
  },
  logoText: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoEco: {
    fontSize: 52,
    fontWeight: "700",
    color: PALETTE.mist, // Mist
    letterSpacing: -2,
    fontFamily: "PlayfairDisplay-Bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoScore: {
    fontSize: 52,
    fontWeight: "400",
    color: PALETTE.sand, // Sand
    letterSpacing: -2,
    fontFamily: "PlayfairDisplay-Regular",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 26,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 34,
    fontFamily: "PlayfairDisplay-Regular",
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.80)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
    fontFamily: "PlayfairDisplay-Regular",
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
    backgroundColor: "#0d47a1", // Mist @ 35%
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 5,
    marginVertical: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  featureText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "PlayfairDisplay-Medium",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,155,169,0.65)", // Teal @ 65%
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 50,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonPressed: {
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleG: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "700",
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    // fontFamily: "PlayfairDisplay-SemiBold",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.70)",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "PlayfairDisplay-Regular",
  },
});
