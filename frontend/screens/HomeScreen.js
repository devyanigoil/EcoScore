import React from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { MODULES } from "./modules.config";
import { baseStyles, homeStyles, COLORS } from "../styles/theme";
import RadialModulesFab from "./RadialModulesFab";

// Mock data (wire up later to real backend)
const monthlyBreakdown = [
  { key: "Shopping", icon: "🛒", delta: 620 },
  { key: "Transit", icon: "🚶", delta: 340 },
  { key: "Energy", icon: "💡", delta: 180 },
  { key: "Food", icon: "🥗", delta: 250 },
];

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={baseStyles.container}>
      {/* Background theme */}
      <View style={baseStyles.backgroundGradient}>
        <View style={[baseStyles.circle, baseStyles.circle1]} />
        <View style={[baseStyles.circle, baseStyles.circle2]} />
        <View style={[baseStyles.circle, baseStyles.circle3]} />
      </View>
      <ScrollView
        contentContainerStyle={homeStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header pill */}
        <View style={homeStyles.headerPill}>
          <Text style={homeStyles.headerTitle}>Dashboard</Text>
        </View>

        {/* Score card */}
        <View style={homeStyles.card}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent, COLORS.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={homeStyles.scorePill}
          >
            <Text style={homeStyles.scoreValue}>2,847</Text>
            <Text style={homeStyles.scoreLabel}>Your EcoScore</Text>
          </LinearGradient>

          {/* Month breakdown */}
          <Text style={homeStyles.sectionTitle}>This Month:</Text>
          <View style={homeStyles.breakdownWrap}>
            {monthlyBreakdown.map((row) => (
              <View key={row.key} style={homeStyles.breakdownRow}>
                <Text style={homeStyles.breakdownLeft}>
                  <Text style={homeStyles.emoji}>{row.icon} </Text>
                  {row.key}:
                </Text>
                <Text style={homeStyles.breakdownRight}>+{row.delta} pts</Text>
              </View>
            ))}
          </View>

          {/* Status ribbon */}
          <View style={homeStyles.statusRibbon}>
            <Text style={homeStyles.statusTitle}>Status: Gold Member</Text>
            <Text style={homeStyles.statusSub}>Top 8% of users</Text>
          </View>
        </View>

        {/* Suggested widgets (placeholders) */}
        <View style={homeStyles.row}>
          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Weekly Goal</Text>
            <Text style={homeStyles.widgetMetric}>3/5 actions</Text>
            <View style={homeStyles.progressBar}>
              <View style={[homeStyles.progressFill, { width: "60%" }]} />
            </View>
            <Text style={homeStyles.widgetHint}>
              2 more for a 200-pt streak bonus
            </Text>
          </View>

          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>CO₂ Saved</Text>
            <Text style={homeStyles.widgetMetric}>18.4 kg</Text>
            <Text style={homeStyles.widgetHint}>≈ 150 km avoided by car</Text>
          </View>
        </View>

        <View style={homeStyles.row}>
          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Next Reward</Text>
            <Text style={homeStyles.widgetMetric}>$5 cashback</Text>
            <Text style={homeStyles.widgetHint}>Earn in ~350 pts</Text>
          </View>

          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Tip of the Day</Text>
            <Text style={homeStyles.widgetHint}>
              Swap one meat meal with plant-based: save ~2 kg CO₂.
            </Text>
          </View>
        </View>

        <View style={[homeStyles.widget, homeStyles.full]}>
          <Text style={homeStyles.widgetTitle}>Recent Actions</Text>
          <View style={homeStyles.historyRow}>
            <Text style={homeStyles.historyItem}>🚲 Biked to campus</Text>
            <Text style={homeStyles.historyPts}>+60</Text>
          </View>
          <View style={homeStyles.historyRow}>
            <Text style={homeStyles.historyItem}>
              🔌 Turned off idle devices
            </Text>
            <Text style={homeStyles.historyPts}>+35</Text>
          </View>
          <View style={homeStyles.historyRow}>
            <Text style={homeStyles.historyItem}>🥗 Cooked at home</Text>
            <Text style={homeStyles.historyPts}>+45</Text>
          </View>
        </View>
      </ScrollView>
      <RadialModulesFab
        modules={MODULES}
        onSelect={(key) => {
          if (key === "shopping") navigation.navigate("Shopping");
          if (key === "transport") navigation.navigate("Transportation");
          if (key === "energy") navigation.navigate("Energy");
        }}
      />
    </View>
  );
}
