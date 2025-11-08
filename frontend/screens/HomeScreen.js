import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import ModulesPanel from "./ModulesPanel";
import { MODULES } from "./modules.config";
import {
  useFonts,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { oceanSunsetNeumorphicStyles as base } from "../colorThemes";
import RadialModulesFab from "./RadialModulesFab";

const { width } = Dimensions.get("window");

// Mock data (wire up later to real backend)
const monthlyBreakdown = [
  { key: "Shopping", icon: "🛒", delta: 620 },
  { key: "Transit", icon: "🚶", delta: 340 },
  { key: "Energy", icon: "💡", delta: 180 },
  { key: "Food", icon: "🥗", delta: 250 },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={base.container}>
      {/* Background theme */}
      <View style={base.backgroundGradient}>
        <View style={[base.circle, base.circle1]} />
        <View style={[base.circle, base.circle2]} />
        <View style={[base.circle, base.circle3]} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header pill */}
        <View style={styles.headerPill}>
          <Text style={styles.headerTitle}>Home{"\n"}Dashboard</Text>
        </View>

        {/* Score card */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#826AED", "#6D5CE7", "#5863F8"]} // cool violet/indigo blend over your ocean palette
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scorePill}
          >
            <Text style={styles.scoreValue}>2,847</Text>
            <Text style={styles.scoreLabel}>Your EcoScore</Text>
          </LinearGradient>

          {/* Month breakdown */}
          <Text style={styles.sectionTitle}>This Month:</Text>
          <View style={styles.breakdownWrap}>
            {monthlyBreakdown.map((row) => (
              <View key={row.key} style={styles.breakdownRow}>
                <Text style={styles.breakdownLeft}>
                  <Text style={styles.emoji}>{row.icon} </Text>
                  {row.key}:
                </Text>
                <Text style={styles.breakdownRight}>+{row.delta} pts</Text>
              </View>
            ))}
          </View>

          {/* Status ribbon */}
          <View style={styles.statusRibbon}>
            <Text style={styles.statusTitle}>Status: Gold Member</Text>
            <Text style={styles.statusSub}>Top 8% of users</Text>
          </View>
        </View>

        {/* Suggested widgets (placeholders) */}
        <View style={styles.row}>
          <View style={[styles.widget, styles.widgetHalf]}>
            <Text style={styles.widgetTitle}>Weekly Goal</Text>
            <Text style={styles.widgetMetric}>3/5 actions</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "60%" }]} />
            </View>
            <Text style={styles.widgetHint}>
              2 more for a 200-pt streak bonus
            </Text>
          </View>

          <View style={[styles.widget, styles.widgetHalf]}>
            <Text style={styles.widgetTitle}>CO₂ Saved</Text>
            <Text style={styles.widgetMetric}>18.4 kg</Text>
            <Text style={styles.widgetHint}>≈ 150 km avoided by car</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.widget, styles.widgetHalf]}>
            <Text style={styles.widgetTitle}>Next Reward</Text>
            <Text style={styles.widgetMetric}>$5 cashback</Text>
            <Text style={styles.widgetHint}>Earn in ~350 pts</Text>
          </View>

          <View style={[styles.widget, styles.widgetHalf]}>
            <Text style={styles.widgetTitle}>Tip of the Day</Text>
            <Text style={styles.widgetHint}>
              Swap one meat meal with plant-based: save ~2 kg CO₂.
            </Text>
          </View>
        </View>

        <View style={[styles.widget, styles.full]}>
          <Text style={styles.widgetTitle}>Recent Actions</Text>
          <View style={styles.historyRow}>
            <Text style={styles.historyItem}>🚲 Biked to campus</Text>
            <Text style={styles.historyPts}>+60</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyItem}>🔌 Turned off idle devices</Text>
            <Text style={styles.historyPts}>+35</Text>
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyItem}>🥗 Cooked at home</Text>
            <Text style={styles.historyPts}>+45</Text>
          </View>
        </View>
      </ScrollView>
      <RadialModulesFab
        modules={MODULES}
        onSelect={(key) => {
          if (key === "shopping") navigation.navigate("Shopping");
          if (key === "transport") navigation.navigate("Transportation");
        }}
      />
    </View>
  );
}

const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 14,
    ...cardShadow,
  },
  headerTitle: {
    color: "#E8F1F2",
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },

  card: {
    width: width * 0.9,
    borderRadius: 28,
    backgroundColor: "#0a4966", // slightly lighter than base.container
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 18,
    ...cardShadow,
  },

  scorePill: {
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 12,
  },
  scoreValue: {
    color: "#FFFFFF",
    fontSize: 42,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 2,
    fontFamily: "PlayfairDisplay_600SemiBold",
  },

  sectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: "#E6EEF0",
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
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
    color: "#E6EEF0",
    fontSize: 15,
  },
  emoji: { fontSize: 16 },
  breakdownRight: {
    color: "#CDE8FF",
    fontSize: 15,
    fontWeight: "600",
  },

  statusRibbon: {
    backgroundColor: "rgba(214, 234, 248, 0.25)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusTitle: {
    color: "#F3F8FB",
    fontWeight: "700",
    marginBottom: 2,
  },
  statusSub: {
    color: "rgba(255,255,255,0.85)",
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
    backgroundColor: "rgba(10,73,102,0.85)",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    ...cardShadow,
  },
  widgetHalf: { flexBasis: "48%" },
  full: { width: width * 0.9, alignSelf: "center" },

  widgetTitle: {
    color: "#EAF4F6",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 15,
    marginBottom: 6,
  },
  widgetMetric: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  widgetHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },

  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#edae49",
  },

  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  historyItem: { color: "#EAF4F6", fontSize: 14 },
  historyPts: { color: "#CDE8FF", fontWeight: "700" },
});
