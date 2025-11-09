import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Color Palette - Green Theme (matching Co2unt design)
export const COLORS = {
  // Background
  background: "#000000", // Pure black background
  darkGray: "#1A1A1A", // Dark gray for cards
  mediumGray: "#2A2A2A", // Medium gray for sections

  // Green shades (matching the Co2unt design)
  primary: "#4CAF50", // Bright green
  primaryDark: "#4CAF50", // Darker green
  primaryLight: "#4CAF50", // Lighter green

  // Accent colors
  accent: "#4CAF50", // Accent green
  accentDark: "#4CAF50", // Dark accent green

  // Text colors
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.85)",
  textTertiary: "rgba(255, 255, 255, 0.60)",

  // UI elements
  border: "rgba(255, 255, 255, 0.12)",
  borderLight: "rgba(255, 255, 255, 0.08)",
  overlay: "rgba(255, 255, 255, 0.10)",
  overlayLight: "rgba(255, 255, 255, 0.06)",
};

// Common shadow styles
const shadowStyles = {
  light: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heavy: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Base Styles
export const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    opacity: 0.08,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: COLORS.primary,
    top: -100,
    left: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.primaryLight,
    bottom: -50,
    right: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: COLORS.accent,
    top: height * 0.4,
    right: width * 0.2,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 30,
    width: "100%",
    maxWidth: 500,
  },
});

// Login Screen Styles
export const loginStyles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}33`, // 20% opacity
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    ...shadowStyles.medium,
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
    color: COLORS.primaryLight,
    letterSpacing: -2,
    // fontFamily: "PlayfairDisplay-Bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoScore: {
    fontSize: 52,
    fontWeight: "400",
    color: COLORS.textSecondary,
    letterSpacing: -2,
    // fontFamily: "PlayfairDisplay-Regular",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 34,
    // fontFamily: "PlayfairDisplay-Regular",
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
    // fontFamily: "PlayfairDisplay-Regular",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 50,
    width: "100%",
    maxWidth: 320,
    ...shadowStyles.heavy,
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.6,
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
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    textAlign: "center",
    // fontFamily: "PlayfairDisplay-Regular",
  },
});

// Home Screen Styles
export const homeStyles = StyleSheet.create({
  content: {
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 18,
    width,
    alignItems: "center",
  },
  headerPill: {
    width: width * 0.9,
    borderRadius: 20,
    backgroundColor: COLORS.darkGray,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...shadowStyles.medium,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    textAlign: "center",
    // fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  card: {
    width: width * 0.9,
    borderRadius: 28,
    backgroundColor: COLORS.darkGray,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    ...shadowStyles.medium,
  },
  scorePill: {
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 12,
  },
  scoreValue: {
    color: COLORS.textPrimary,
    fontSize: 42,
    // fontFamily: "PlayfairDisplay_700Bold",
  },
  scoreLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
    // fontFamily: "PlayfairDisplay_600SemiBold",
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: COLORS.textPrimary,
    fontSize: 16,
    // fontFamily: "PlayfairDisplay_700Bold",
  },
  breakdownWrap: {
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  breakdownLeft: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  emoji: { fontSize: 16 },
  breakdownRight: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: "600",
  },
  statusRibbon: {
    backgroundColor: COLORS.overlay,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  row: {
    width: width * 0.9,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  widget: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadowStyles.medium,
  },
  widgetHalf: { flexBasis: "48%" },
  full: { width: width * 0.9, alignSelf: "center" },
  widgetTitle: {
    color: COLORS.textPrimary,
    // fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    marginBottom: 6,
  },
  widgetMetric: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  widgetHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.overlayLight,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  historyItem: { color: COLORS.textPrimary, fontSize: 14 },
  historyPts: { color: COLORS.primaryLight, fontWeight: "700" },
});

// Scanner Screen Styles (Shopping & Energy)
export const scannerStyles = StyleSheet.create({
  content: {
    paddingTop: 18,
    paddingBottom: 60,
    paddingHorizontal: 18,
  },
  statsCol: {
    width: "100%",
    flexDirection: "column",
    gap: 12, // if your RN version lacks gap, remove this and use marginBottom on statCard
  },
  headerPill: {
    borderRadius: 18,
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  cta: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  ctaPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.border,
  },
  ctaSecondary: {
    backgroundColor: COLORS.overlay,
    borderColor: COLORS.border,
  },
  ctaEmoji: { fontSize: 24, marginBottom: 6 },
  ctaText: { color: COLORS.textPrimary, fontWeight: "700" },
  previewCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.overlayLight,
    marginBottom: 12,
  },
  preview: { width: "100%", height: 240, resizeMode: "cover" },
  previewHint: {
    color: COLORS.textSecondary,
    padding: 8,
    textAlign: "center",
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  previewAnalyzing: {
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  loadingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.overlayLight,
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  resultsWrap: { gap: 14 },
  scoreWrap: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 14,
  },
  scoreMeta: { flex: 1 },
  storeTag: {
    color: COLORS.primaryLight,
    fontWeight: "700",
    marginBottom: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  metaHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  donutValue: {
    position: "absolute",
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "800",
  },
  donutLabel: {
    position: "absolute",
    marginTop: 34,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  bubblesCard: {
    borderRadius: 22,
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 16,
  },
  bubblesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bubble: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleName: {
    color: COLORS.textPrimary,
    fontSize: 11,
    textAlign: "center",
  },
  bubbleScore: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.darkGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  statValue: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 18,
  },
  statLabel: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kvWrap: { gap: 10 },
  kvRow: { flexDirection: "row", gap: 8 },
  kvLabel: {
    color: COLORS.textSecondary,
    width: 120,
  },
  kvValue: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  eqPill: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eqTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 4,
  },
  eqLine: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  secondaryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.overlay,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
});

// Transportation Screen Styles
export const transportStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  h: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  t: {
    color: COLORS.textSecondary,
  },
});
