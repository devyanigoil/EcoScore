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

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Fetch user info
        const userResponse = await axios.get(`${API_URL}/${userId}`);
        console.log("✅ User fetched:", userResponse.data);
        setUserData(userResponse.data);

        // Fetch points summary
        const pointsResponse = await axios.get(`${POINTS_URL}/${userId}`);
        console.log("✅ Points fetched:", pointsResponse.data);
        setPointsData(pointsResponse.data);

        // Fetch percentile data
        const percentileResponse = await axios.get(
          `${PERCENTILE_URL}/${userId}`
        );
        console.log("✅ Percentile fetched:", percentileResponse.data);
        setPercentileData(percentileResponse.data);
      } catch (error) {
        console.error("❌ Failed to fetch data:", error.message);
      }
    };

    fetchData();
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
              score={percentile}
              // fixedColor="#3DDC84" // uncomment to force a single green
            />
            <Text style={{ color: "#A7A7A7", marginTop: 6 }}>
              Top {percentile.toFixed(0)}% Percentile
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

        {/* Suggested widgets */}
        <View style={homeStyles.row}>
          <View style={[homeStyles.widget, homeStyles.widgetHalf]}>
            <Text style={homeStyles.widgetTitle}>Today's Points</Text>
            <Text style={homeStyles.widgetMetric}>
              {pointsData?.today_points || 0} pts
            </Text>
            <Text style={homeStyles.widgetHint}>Keep going to earn more!</Text>
          </View>

          {/* Rewards Card - Interactive */}
          <Pressable
            style={[homeStyles.widget, homeStyles.widgetHalf]}
            onPress={() =>
              navigation.navigate("Rewards", {
                userId,
                ecoScore: percentile,
                tier,
              })
            }
            android_ripple={{ color: "#222" }}
          >
            <Text style={homeStyles.widgetTitle}>Rewards</Text>
            <Text style={homeStyles.widgetMetric}>🎁</Text>
            <Text style={homeStyles.widgetHint}>Tap to view discounts</Text>
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
