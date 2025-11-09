// HomeScreen.js
import React, { useEffect, useState, useCallback } from "react";
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
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native"; // ← NEW
import { MODULES } from "./modules.config";
import { baseStyles, homeStyles, COLORS } from "../styles/theme";
import RadialModulesFab from "./RadialModulesFab";
import EcoScoreRing, { getTier, TIERS } from "./EcoScoreRing";
import axios from "axios";
import { resolveApiBase } from "./functions";

const API_URL = `${resolveApiBase()}/user`;
const POINTS_URL = `${resolveApiBase()}/points`;
const PERCENTILE_URL = `${resolveApiBase()}/percentile`;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const userId = params?.userId;

  const [userData, setUserData] = useState({ user_name: "" });
  const [pointsData, setPointsData] = useState(null);
  const [percentileData, setPercentileData] = useState(null);

  const [tiersOpen, setTiersOpen] = useState(false);

  // Use percentile instead of raw score
  const percentile = percentileData?.percentile || 0;
  const tier = getTier(percentile);

  // Build monthly breakdown from API data
  const monthlyBreakdown = pointsData
    ? [
        { key: "Shopping", icon: "🛒", delta: pointsData.by_type.shopping },
        {
          key: "Transit",
          icon: "🚶",
          delta: pointsData.by_type.transportation,
        },
        { key: "Energy", icon: "💡", delta: pointsData.by_type.energy },
        // Add Food if you have it in your API, otherwise remove or set to 0
        { key: "Food", icon: "🥗", delta: 0 },
      ]
    : [];

  const fetchAll = useCallback(async () => {
    if (!userId) return;

    const controller = new AbortController();
    const { signal } = controller;

    try {
      const [userRes, pointsRes, pctRes] = await Promise.all([
        axios.get(`${API_URL}/${userId}`, { signal }),
        axios.get(`${POINTS_URL}/${userId}`, { signal }),
        axios.get(`${PERCENTILE_URL}/${userId}`, { signal }),
      ]);

      setUserData(userRes.data);
      setPointsData(pointsRes.data);
      setPercentileData(pctRes.data);
    } catch (err) {
      if (err.name !== "CanceledError" && err.message !== "canceled") {
        console.error("❌ Fetch failed:", err.message);
      }
    }

    // return a cleanup function for whoever calls fetchAll inside an effect
    return () => controller.abort();
  }, [userId]);

  // Run on first mount and whenever userId changes
  useEffect(() => {
    let cleanup;
    fetchAll().then((fn) => (cleanup = fn));
    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchAll]);

  // Re-run whenever the screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      let cleanup;
      fetchAll().then((fn) => (cleanup = fn));
      return () => {
        if (cleanup) cleanup();
      };
    }, [fetchAll])
  );

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
              score={percentile}
              // fixedColor="#3DDC84" // uncomment to force a single green
            />
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
        </View>
        {/* Suggested widgets */}
        <View style={homeStyles.row}>
          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Today's Points</Text>
            <Text style={homeStyles.widgetMetric}>
              {pointsData?.today_points || 0} pts
            </Text>
            <Text style={homeStyles.widgetHint}>Keep going to earn more!</Text>
          </View>

          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Tip of the Day</Text>
            <Text style={homeStyles.widgetHint}>
              Swap one meat meal with plant-based: save ~2 kg CO₂.
            </Text>
          </View>

          {/* Rewards Card - Enhanced Button Style */}
        </View>
        <View style={homeStyles.row}>
          <Pressable
            style={({ pressed }) => [
              homeStyles.widget,
              homeStyles.widgetHalf,
              localStyles.rewardsButton,
              pressed && localStyles.rewardsButtonPressed,
            ]}
            onPress={() =>
              navigation.navigate("Rewards", {
                userId,
                ecoScore: percentile,
                tier,
              })
            }
            android_ripple={{ color: "#333" }}
          >
            <View style={localStyles.rewardsContent}>
              <Text style={homeStyles.widgetTitle}>Rewards</Text>
              <Text style={localStyles.rewardsIcon}>🎁</Text>
              <Text style={homeStyles.widgetHint}>View discounts</Text>
              <Text style={localStyles.rewardsArrow}>→</Text>
            </View>
          </Pressable>
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
                    {item.name} — {item.min}–{item.max}%
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

  // Enhanced Rewards Button Styles
  rewardsButton: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rewardsButtonPressed: {
    transform: [{ scale: 0.96 }],
    elevation: 2,
    shadowOpacity: 0.15,
  },
  rewardsContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardsIcon: {
    fontSize: 48,
    marginVertical: 4,
  },
  rewardsArrow: {
    position: "absolute",
    bottom: 8,
    right: 8,
    fontSize: 20,
    color: "#888",
    fontWeight: "600",
  },

  // Modal Styles
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
