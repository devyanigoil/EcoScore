// HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { MODULES } from "./modules.config";
import { baseStyles, homeStyles, COLORS } from "../styles/theme";
import RadialModulesFab from "./RadialModulesFab";
import EcoScoreRing, { getTier, TIERS } from "./EcoScoreRing";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import { resolveApiBase } from "./functions";

const API_URL = `${resolveApiBase()}/user`;

// Mock data (wire up later to real backend)
const monthlyBreakdown = [
  { key: "Shopping", icon: "🛒", delta: 620 },
  { key: "Transit", icon: "🚶", delta: 340 },
  { key: "Energy", icon: "💡", delta: 180 },
  { key: "Food", icon: "🥗", delta: 250 },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const userId = params?.userId;
  const [userData, setUserData] = useState(null);

  // Example eco score (0..1000); replace with real state from backend
  const ecoScore = 300;
  const tier = getTier(ecoScore);

  const [tiersOpen, setTiersOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/${userId}`);
        console.log("✅ User fetched:", response.data);
        setUserData(response.data);
      } catch (error) {
        console.error("❌ Failed to fetch user:", error.message);
      }
    };

    fetchUser();
  }, [userId]);

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
          <Text style={homeStyles.headerTitle}>
            Welcome {userData.user_name}
          </Text>
        </View>

        {/* Score card */}
        <View style={homeStyles.card}>
          {/* Top: animated EcoScore ring */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <EcoScoreRing
              score={ecoScore}
              // fixedColor="#3DDC84" // uncomment to force a single green
            />
            <Text style={{ color: "#A7A7A7", marginTop: 6 }}>
              Your EcoScore
            </Text>
          </View>

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

          {/* Status ribbon -> press to open tiers */}
          <Pressable
            onPress={() => setTiersOpen(true)}
            style={[homeStyles.statusRibbon, localStyles.statusPressable]}
            android_ripple={{ color: "#222" }}
          >
            <View style={[localStyles.dot, { backgroundColor: tier.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={homeStyles.statusTitle}>
                Status: {tier.name} Member
              </Text>
              <Text style={homeStyles.statusSub}>Tap to view tiers</Text>
            </View>
          </Pressable>
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
          if (key === "shopping") navigation.navigate("Shopping", { userId });
          if (key === "transport")
            navigation.navigate("Transportation", { userId });
          if (key === "energy") navigation.navigate("Energy", { userId });
        }}
      />

      {/* Tiers modal */}
      <Modal visible={tiersOpen} transparent animationType="fade">
        <Pressable
          style={localStyles.backdrop}
          onPress={() => setTiersOpen(false)}
        >
          <View style={localStyles.sheet}>
            <Text style={localStyles.title}>EcoScore Tiers</Text>
            <FlatList
              data={TIERS}
              keyExtractor={(t) => t.name}
              renderItem={({ item }) => (
                <View style={localStyles.row}>
                  <View
                    style={[localStyles.badge, { backgroundColor: item.color }]}
                  />
                  <Text style={localStyles.rowText}>
                    {item.name} — {item.min}–{item.max}
                  </Text>
                </View>
              )}
            />
            <Pressable
              style={localStyles.close}
              onPress={() => setTiersOpen(false)}
            >
              <Text style={{ color: "black", fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  statusPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 6, marginRight: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#121212",
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 8,
  },
  title: { color: "white", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  badge: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  rowText: { color: "white" },
  close: {
    marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: "#E5E4E2",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
