import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { baseStyles, COLORS } from "../styles/theme";
import { Animated, Easing } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { resolveApiBase } from "./functions";
import History from "./PastReceipts";

const API_URL = `${resolveApiBase()}/ocr/upload`;

export default function Shopping() {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { params } = useRoute();
  const userId = params?.userId;

  // "idle" | "scan" | "analyze"
  const [loadingStage, setLoadingStage] = useState("idle");

  // Gentle pulse for icons / ring
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (loadingStage === "idle") {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loadingStage]);

  const askMediaPerms = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to upload.");
      return false;
    }
    return true;
  };

  const askCameraPerms = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to capture.");
      return false;
    }
    return true;
  };

  const pickImage = useCallback(async () => {
    if (!(await askMediaPerms())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      upload(res.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (!(await askCameraPerms())) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
      setResult(null);
      upload(res.assets[0].uri);
    }
  }, []);

  const upload = useCallback(async (uri) => {
    try {
      setLoading(true);
      setResult(null);
      setLoadingStage("scan"); // Stage 1 begins

      // --- Always show stage 1 for 2 seconds ---
      await new Promise((r) => setTimeout(r, 2000));
      setLoadingStage("analyze"); // Move to stage 2

      // Prepare image form
      const form = new FormData();
      
      if (Platform.OS === "web") {
        // Web needs Blob/File
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], "receipt.jpg", {
          type: "image/jpeg",
        });
        form.append("image", file);
      } else {
        // Native
        form.append("image", {
          uri,
          name: "receipt.jpg",
          type: "image/jpeg",
        });
      }

      form.append("userId", String(userId));

      console.log("Uploading receipt...");

      // Call API
      const resp = await fetch(API_URL, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Upload failed: ${resp.status} ${txt}`);
      }

      const data = await resp.json();
      console.log(data);

      // Briefly hold the analyze state (optional ~0.6 s)
      await new Promise((r) => setTimeout(r, 600));

      // Done — show results
      setResult(normalizePayload(data));
    } catch (e) {
      console.log(e);
      Alert.alert("Error", e.message || "Failed to analyze receipt.");
    } finally {
      setLoading(false);
      setLoadingStage("idle");
    }
  }, [userId]);

  const reset = useCallback(() => {
    setImageUri(null);
    setResult(null);
    setLoading(false);
    setLoadingStage("idle");
  }, []);

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
        <View style={styles.headerPill}>
          <Text style={styles.headerTitle}>Shopping Receipt Analyzer</Text>
          <Text style={styles.headerSub}>
            Capture or upload a receipt to track carbon footprint
          </Text>
        </View>

        {/* Actions */}
        {!result && !loading && (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.cta, styles.ctaPrimary]}
              onPress={takePhoto}
            >
              <Text style={styles.ctaEmoji}>📷</Text>
              <Text style={styles.ctaText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, styles.ctaSecondary]}
              onPress={pickImage}
            >
              <Text style={styles.ctaEmoji}>📤</Text>
              <Text style={styles.ctaText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {!imageUri && !result && <History userId={userId} type="shopping" />}

        {/* Preview */}
        {imageUri && !loading && !result && (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Text style={styles.previewHint}>Analyzing your receipt…</Text>
          </View>
        )}

        {/* Two-stage Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            {loadingStage === "scan" ? (
              <StageScan pulse={pulse} />
            ) : (
              <StageAnalyze pulse={pulse} />
            )}
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsWrap}>
            {/* Summary Badge */}
            <View style={styles.scoreWrap}>
              <View style={styles.scoreMeta}>
                {!!result.store && (
                  <Text style={styles.storeTag}>🏬 {result.store}</Text>
                )}
                <LinearGradient
                  colors={["#edae49", "#d1495b"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    Total: {result.totalKg.toFixed(1)} kg CO₂e
                  </Text>
                </LinearGradient>
                <Text style={styles.metaHint}>
                  Lower is better. Choose sustainable products to reduce your impact.
                </Text>
              </View>
            </View>

            {/* Receipt Details */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Receipt Summary</Text>
              <View style={styles.blocksWrap}>
                {result.store && (
                  <RowBlock label="Store" value={result.store} />
                )}
                <RowBlock 
                  label="Items Scanned" 
                  value={`${result.items.length} ${result.items.length === 1 ? 'item' : 'items'}`} 
                />
                <RowBlock 
                  label="Total Emissions" 
                  value={`${result.totalKg.toFixed(2)} kg CO₂e`} 
                />
                <RowBlock 
                  label="Avg per Item" 
                  value={`${(result.totalKg / Math.max(1, result.items.length)).toFixed(2)} kg`} 
                />
                {result.date && (
                  <RowBlock label="Date" value={result.date} />
                )}
              </View>
            </View>

            {/* Top Impact Items Bubbles */}
            <View style={styles.bubblesCard}>
              <Text style={styles.sectionTitle}>Top Impact Items</Text>
              <ItemBubbles items={result.items} />
            </View>

            {/* Environmental Impact */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Environmental Impact</Text>
              <View style={styles.blocksWrap}>
                <RowBlock 
                  label="Carbon Footprint" 
                  value={`${result.totalKg.toFixed(2)} kg CO₂e`} 
                />
                <RowBlock 
                  label="Equivalent Miles Driven" 
                  value={`${(result.totalKg * 1.4).toFixed(1)} mi`} 
                />
                <RowBlock 
                  label="Trees to Offset (yearly)" 
                  value={Math.max(0.1, result.totalKg / 40).toFixed(2)} 
                />
              </View>
            </View>

            {/* Item Breakdown */}
            {result.items.length > 0 && (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>
                  Item Breakdown ({result.items.length})
                </Text>
                <View style={styles.blocksWrap}>
                  {result.items.slice(0, 10).map((item, idx) => (
                    <RowBlock 
                      key={`${item.name}-${idx}`}
                      label={item.name}
                      value={`${item.carbonScore.toFixed(2)} kg`}
                    />
                  ))}
                  {result.items.length > 10 && (
                    <Text style={styles.moreItemsHint}>
                      + {result.items.length - 10} more items
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* CTA */}
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={reset}
              >
                <Text style={styles.secondaryBtnText}>Scan another receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ================= Helper Components ================= */

function RowBlock({ label, value }) {
  return (
    <View style={styles.blockRow}>
      <Text style={styles.blockLabel}>{label}</Text>
      <Text style={styles.blockValue}>{value}</Text>
    </View>
  );
}

function StageScan({ pulse }) {
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Animated.View
        style={{
          transform: [{ scale: pulse }],
          padding: 20,
          borderRadius: 999,
          backgroundColor: "rgba(74,158,255,0.12)",
        }}
      >
        <MaterialCommunityIcons
          name="receipt"
          size={46}
          color={COLORS.primary}
        />
      </Animated.View>

      <Text style={styles.loadingText}>Scanning the receipt…</Text>

      {/* Animated scanning ring */}
      <Animated.View
        style={{
          marginTop: 4,
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.18)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: "120%",
            height: 6,
            backgroundColor: COLORS.primary,
            opacity: 0.5,
            transform: [
              {
                translateY: pulse.interpolate({
                  inputRange: [1, 1.08],
                  outputRange: [-28, 28],
                }),
              },
            ],
          }}
        />
        <Ionicons name="scan" size={24} color="white" />
      </Animated.View>
    </View>
  );
}

function StageAnalyze({ pulse }) {
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Animated.View
        style={{
          transform: [{ scale: pulse }],
          padding: 20,
          borderRadius: 999,
          backgroundColor: "rgba(237,174,73,0.14)",
        }}
      >
        <MaterialCommunityIcons name="brain" size={46} color={COLORS.accent} />
      </Animated.View>

      <Text style={styles.loadingText}>Analyzing the receipt…</Text>

      {/* Subtle spinner ring */}
      <Animated.View
        style={{
          marginTop: 4,
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.18)",
          borderTopColor: COLORS.accent,
          transform: [
            {
              rotate: pulse.interpolate({
                inputRange: [1, 1.08],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

/* Bubbles */
function ItemBubbles({ items = [] }) {
  // Filter out items with zero or falsy score, then take top 8
  const top = useMemo(
    () => items.filter((i) => i.carbonScore > 0).slice(0, 8),
    [items]
  );
  const max = useMemo(
    () => Math.max(1, ...top.map((i) => i.carbonScore || 0)),
    [top]
  );

  return (
    <View style={styles.bubblesWrap}>
      {top.map((it, idx) => {
        const weight = (it.carbonScore || 0) / max;
        const size = 54 + Math.round(54 * weight);
        const bg = `rgba(74, 158, 255, ${0.22 + 0.4 * weight})`;
        return (
          <View
            key={`${it.name}-${idx}`}
            style={[
              styles.bubble,
              { width: size, height: size, backgroundColor: bg },
            ]}
          >
            <Text style={styles.bubbleName} numberOfLines={2}>
              {it.name}
            </Text>
            <Text style={styles.bubbleScore}>
              {(it.carbonScore ?? 0).toFixed(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================= Helpers ================= */

function normalizePayload(data) {
  const raw = Array.isArray(data?.items) ? data.items : [];

  // Map payload → UI model
  const items = raw
    .map((it) => ({
      name: it.item_name ?? "Item",
      carbonScore: Number(it.emissions_kg_co2e) || 0, // keep numeric (kg)
    }))
    .sort((a, b) => b.carbonScore - a.carbonScore);

  // Aggregate (kg CO2e)
  const totalKg = items.reduce((s, i) => s + (i.carbonScore || 0), 0);

  // Convert total kg → 0..100 score (lower is better).
  const MAX_RECEIPT_EMISSIONS_KG = 25;
  const overallScore = clamp(
    Math.round((totalKg / MAX_RECEIPT_EMISSIONS_KG) * 100),
    0,
    100
  );

  return {
    overallScore, // 0..100 (lower is better)
    totalKg, // keep the true total for equivalents
    items, // [{name, carbonScore(kg)}]
    store: data.store ?? data.merchant ?? "", // if backend adds later
    date: data.date || null,
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* ================= Styles ================= */

const styles = StyleSheet.create({
  content: { 
    paddingTop: 18, 
    paddingBottom: 60, 
    paddingHorizontal: 18 
  },
  headerPill: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  headerTitle: { 
    color: "#EAF4F6", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  headerSub: { 
    color: "rgba(255,255,255,0.85)", 
    fontSize: 13, 
    marginTop: 4,
    textAlign: "center",
  },
  row: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 14 
  },
  cta: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  ctaPrimary: {
    backgroundColor: "#0a4966",
    borderColor: "rgba(255,255,255,0.16)",
  },
  ctaSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  ctaEmoji: { fontSize: 24, marginBottom: 6 },
  ctaText: { color: "#FFFFFF", fontWeight: "700" },
  previewCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    marginTop: 12,
  },
  preview: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
  },
  previewHint: {
    color: "rgba(255,255,255,0.85)",
    padding: 8,
    textAlign: "center",
  },
  loadingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 12,
  },
  loadingText: { 
    marginTop: 10, 
    color: "#EAF4F6", 
    fontWeight: "600" 
  },
  resultsWrap: { gap: 14 },
  scoreWrap: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 14,
  },
  scoreMeta: { flex: 1 },
  storeTag: { 
    color: "#CDE8FF", 
    fontWeight: "700", 
    marginBottom: 6,
    fontSize: 14,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 12 
  },
  metaHint: { 
    color: "rgba(255,255,255,0.85)", 
    fontSize: 12, 
    marginTop: 2 
  },
  detailsCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
  },
  sectionTitle: {
    color: "#EAF4F6",
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 16,
  },
  blocksWrap: {
    marginTop: 6,
    gap: 8,
  },
  blockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  blockLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    flex: 1,
  },
  blockValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
  },
  moreItemsHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  bubblesCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
  },
  bubblesWrap: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 10 
  },
  bubble: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleName: { 
    color: "#FFFFFF", 
    fontSize: 11, 
    textAlign: "center" 
  },
  bubbleScore: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 12, 
    marginTop: 2 
  },
  bottomRow: { 
    gap: 10,
    alignItems: "center",
  },
  secondaryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  secondaryBtnText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
});