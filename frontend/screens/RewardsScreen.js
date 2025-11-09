// RewardsScreen.js
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { baseStyles } from "../styles/theme";

// Store rewards configuration based on tiers
const STORES = [
  {
    id: 1,
    name: "Trader Joe's",
    logo: "https://logo.clearbit.com/traderjoes.com",
    category: "Grocery",
    minTier: "Bronze",
    discounts: {
      Bronze: 5,
      Silver: 8,
      Gold: 12,
      Diamond: 15,
    },
  },
  {
    id: 2,
    name: "Whole Foods",
    logo: "https://logo.clearbit.com/wholefoodsmarket.com",
    category: "Grocery",
    minTier: "Bronze",
    discounts: {
      Bronze: 5,
      Silver: 10,
      Gold: 15,
      Diamond: 20,
    },
  },
  {
    id: 3,
    name: "Walmart",
    logo: "https://logo.clearbit.com/walmart.com",
    category: "Retail",
    minTier: "Bronze",
    discounts: {
      Bronze: 3,
      Silver: 5,
      Gold: 8,
      Diamond: 10,
    },
  },
  {
    id: 4,
    name: "JC Penney",
    logo: "https://logo.clearbit.com/jcpenney.com",
    category: "Fashion",
    minTier: "Bronze",
    discounts: {
      Bronze: 5,
      Silver: 10,
      Gold: 15,
      Diamond: 20,
    },
  },
  {
    id: 5,
    name: "Marshalls",
    logo: "https://logo.clearbit.com/marshalls.com",
    category: "Fashion",
    minTier: "Silver",
    discounts: {
      Silver: 8,
      Gold: 12,
      Diamond: 15,
    },
  },
  {
    id: 6,
    name: "Michael Kors",
    logo: "https://logo.clearbit.com/michaelkors.com",
    category: "Luxury",
    minTier: "Gold",
    discounts: {
      Gold: 10,
      Diamond: 15,
    },
  },
  {
    id: 7,
    name: "Nordstrom",
    logo: "https://logo.clearbit.com/nordstrom.com",
    category: "Luxury",
    minTier: "Gold",
    discounts: {
      Gold: 12,
      Diamond: 18,
    },
  },
];

// Helper to check if user's tier qualifies for a store
const canAccessStore = (userTier, storeTier) => {
  const tierOrder = ["Bronze", "Silver", "Gold", "Diamond"];
  const userIndex = tierOrder.indexOf(userTier);
  const storeIndex = tierOrder.indexOf(storeTier);
  return userIndex >= storeIndex;
};

export default function RewardsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tier, ecoScore } = route.params || {};

  const userTier = tier?.name || "Bronze";

  const handleAvail = (store) => {
    // Dummy function for now
    console.log(`User attempting to avail discount at ${store.name}`);
  };

  return (
    <View style={baseStyles.container}>
      {/* Background theme */}
      <View style={baseStyles.backgroundGradient}>
        <View style={[baseStyles.circle, baseStyles.circle1]} />
        <View style={[baseStyles.circle, baseStyles.circle2]} />
        <View style={[baseStyles.circle, baseStyles.circle3]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Rewards Store</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User tier info */}
        <View style={styles.tierCard}>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: tier?.color || "#888" },
            ]}
          />
          <View>
            <Text style={styles.tierTitle}>Your Tier: {userTier}</Text>
            <Text style={styles.tierSub}>Score: {ecoScore || 0} pts</Text>
          </View>
        </View>

        {/* Store cards */}
        {STORES.map((store) => {
          const isLocked = !canAccessStore(userTier, store.minTier);
          const discount = store.discounts[userTier] || 0;

          return (
            <View
              key={store.id}
              style={[styles.storeCard, isLocked && styles.storeCardLocked]}
            >
              <View style={styles.storeHeader}>
                <View style={styles.logoContainer}>
                  <Image source={{ uri: store.logo }} style={styles.logo} />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeCategory}>{store.category}</Text>
                </View>
              </View>

              {isLocked ? (
                <View style={styles.lockedSection}>
                <Text style={styles.lockedText}>🔒 Locked</Text>
                <Text style={styles.lockedSubtext}>
                  Requires {store.minTier} tier or higher
                </Text>
              </View>
              ) : (
                <View style={styles.unlockedSection}>
                <View style={styles.discountBox}>
                  <Text style={styles.discountPercent}>{discount}%</Text>
                  <Text style={styles.discountLabel}>OFF</Text>
                </View>
                <Pressable
                  style={styles.availBtn}
                  onPress={() => handleAvail(store)}
                  android_ripple={{ color: "#1a5f3d" }}
                >
                  <Text style={styles.availText}>Avail</Text>
                </Pressable>
              </View>
              )}
            </View>
          );
        })}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: "white",
    fontSize: 28,
    fontWeight: "600",
  },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
  tierCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  tierBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tierTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  tierSub: {
    color: "#A7A7A7",
    fontSize: 14,
    marginTop: 2,
  },
  storeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  storeCardLocked: {
    opacity: 0.5,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  logoContainer: {
    width: 56,
    height: 56,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  storeCategory: {
    color: "#A7A7A7",
    fontSize: 14,
    marginTop: 2,
  },
  lockedSection: {
    paddingTop: 8,
  },
  lockedText: {
    color: "#A7A7A7",
    fontSize: 16,
    fontWeight: "600",
  },
  lockedSubtext: {
    color: "#777",
    fontSize: 13,
    marginTop: 4,
  },
  unlockedSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  discountBox: {
    alignItems: "center",
  },
  discountPercent: {
    color: "#3DDC84",
    fontSize: 28,
    fontWeight: "700",
  },
  discountLabel: {
    color: "#3DDC84",
    fontSize: 12,
    fontWeight: "600",
    marginTop: -4,
  },
  availBtn: {
    backgroundColor: "#3DDC84",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  availText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});