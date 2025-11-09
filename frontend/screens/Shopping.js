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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { baseStyles, scannerStyles, COLORS } from "../styles/theme";
import { Animated, Easing } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const API_URL = "http://172.31.173.9:8001/ocr/upload"; // <-- replace

export default function Shopping() {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
      upload(res.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (!(await askCameraPerms())) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
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
      form.append("image", {
        uri,
        name: "receipt.jpg",
        type: "image/jpeg",
      });

      // Call API
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Upload failed: ${resp.status} ${txt}`);
      }

      const data = await resp.json();

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
  }, []);

  const reset = useCallback(() => {
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
        contentContainerStyle={scannerStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={scannerStyles.headerPill}>
          <Text style={scannerStyles.headerTitle}>Shopping Scanner</Text>
          <Text style={scannerStyles.headerSub}>
            Upload or capture a receipt
          </Text>
        </View>

        {/* Actions */}
        <View style={scannerStyles.row}>
          <TouchableOpacity
            style={[scannerStyles.cta, scannerStyles.ctaPrimary]}
            onPress={takePhoto}
          >
            <Text style={scannerStyles.ctaEmoji}>📷</Text>
            <Text style={scannerStyles.ctaText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[scannerStyles.cta, scannerStyles.ctaSecondary]}
            onPress={pickImage}
          >
            <Text style={scannerStyles.ctaEmoji}>📤</Text>
            <Text style={scannerStyles.ctaText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {imageUri && !loading && !result && (
          <View style={scannerStyles.previewCard}>
            <Image source={{ uri: imageUri }} style={scannerStyles.preview} />
            <Text style={scannerStyles.previewHint}>Analyzing…</Text>
          </View>
        )}

        {/* Two-stage Loading */}
        {loading && (
          <View style={scannerStyles.loadingCard}>
            {loadingStage === "scan" ? (
              <StageScan pulse={pulse} />
            ) : (
              <StageAnalyze pulse={pulse} />
            )}
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={scannerStyles.resultsWrap}>
            {/* Top: Score Donut  store tag */}
            <View style={scannerStyles.scoreWrap}>
              {/* <ScoreDonut
                score={result.overallScore}
                size={160}
                strokeWidth={14}
              /> */}
              {/* <Text style={scannerStyles.metaHint}>
                Total: {result.totalKg.toFixed(1)} kg CO₂e
              </Text> */}

              <View style={scannerStyles.scoreMeta}>
                {!!result.store && (
                  <Text style={scannerStyles.storeTag}>🏬 {result.store}</Text>
                )}
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={scannerStyles.badge}
                >
                  <Text style={scannerStyles.badgeText}>
                    Total: {result.totalKg.toFixed(1)} kg CO₂e
                  </Text>
                </LinearGradient>
                <Text style={scannerStyles.metaHint}>
                  Lower is better. Keep shopping smart to improve your
                  footprint.
                </Text>
              </View>
            </View>

            {/* Bubbles: items by impact */}
            <View style={scannerStyles.bubblesCard}>
              <Text style={scannerStyles.sectionTitle}>Top Impact Items</Text>
              <ItemBubbles items={result.items} />
            </View>

            {/* Equivalents / CTA */}
            <View style={scannerStyles.resultsWrap}>
              {/* <EquivalentsPill score={result.overallScore} /> */}
              <TouchableOpacity
                style={scannerStyles.secondaryBtn}
                onPress={reset}
              >
                <Text style={scannerStyles.secondaryBtnText}>Scan another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- helpers / components ---------- */

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

      <Text style={scannerStyles.loadingText}>Scanning the receipt…</Text>

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

      <Text style={scannerStyles.loadingText}>Analyzing the receipt…</Text>

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
  // Tune this baseline to your domain. 25 kg ≙ score 100 by default.
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
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function toPercent(value, maxValue) {
  if (!maxValue || !value) return 0;
  return clamp(Math.round((value / maxValue) * 100), 0, 100);
}

function gradeLabel(score) {
  if (score <= 20) return "A";
  if (score <= 35) return "A";
  if (score <= 50) return "B";
  if (score <= 70) return "C";
  return "D";
}

/* Donut score */
function ScoreDonut({ score = 0, size = 160, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp(score, 0, 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          stroke="rgba(255,255,255,0.18)"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          stroke={COLORS.primary}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Text style={scannerStyles.donutValue}>{clamped}</Text>
      <Text style={scannerStyles.donutLabel}>Overall</Text>
    </View>
  );
}

/* Bubbles */
function ItemBubbles({ items = [] }) {
  const top = useMemo(() => items.slice(0, 8), [items]);
  const max = useMemo(
    () => Math.max(1, ...top.map((i) => i.carbonScore || 0)),
    [top]
  );

  return (
    <View style={scannerStyles.bubblesWrap}>
      {top.map((it, idx) => {
        const weight = (it.carbonScore || 0) / max;
        const size = 54 + Math.round(54 * weight);
        const bg = `rgba(74, 158, 255, ${0.22 + 0.4 * weight})`;
        return (
          <View
            key={`${it.name}-${idx}`}
            style={[
              scannerStyles.bubble,
              { width: size, height: size, backgroundColor: bg },
            ]}
          >
            <Text style={scannerStyles.bubbleName} numberOfLines={2}>
              {it.name}
            </Text>
            <Text style={scannerStyles.bubbleScore}>
              {(it.carbonScore ?? 0).toFixed(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* Equivalents pill */
function EquivalentsPill({ totalKg = 0 }) {
  // Factors: ~0.404 kg CO2e per mile; ~21 kg CO2e absorbed per tree/year.
  const miles = Math.round(totalKg / 0.404);
  const trees = Math.max(0.01, totalKg / 21).toFixed(2);

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={scannerStyles.eqPill}
    >
      <Text style={scannerStyles.eqTitle}>What this means</Text>
      <Text style={scannerStyles.eqLine}>🚗 ≈ {miles} miles driven</Text>
      <Text style={scannerStyles.eqLine}>
        🌳 ≈ {trees} trees/year to offset
      </Text>
    </LinearGradient>
  );
}
