import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { oceanSunsetNeumorphicStyles as base } from "../colorThemes";

const API_URL = "http://YOUR_SERVER_IP:8000/receipts/analyze"; // <-- replace

export default function Shopping() {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

  // at top of Shopping.js (optional, keeps intent explicit)
  const USE_MOCK = true;

  // Replace your existing `upload` with this mock-only version
  const upload = useCallback(async (uri) => {
    // absolutely no fetch/multipart here
    setLoading(true);
    setResult(null);

    // show preview while "analyzing"
    try {
      // simulate analysis delay
      await new Promise((r) => setTimeout(r, 2500));

      // mock API-like payload
      const mockResponse = {
        store: "Whole Foods Market",
        overallScore: 47,
        items: [
          { name: "Beef Steak", carbonScore: 28.5 },
          { name: "Organic Chicken Breast", carbonScore: 12.8 },
          { name: "Spinach", carbonScore: 2.3 },
          { name: "Almond Milk", carbonScore: 4.9 },
          { name: "Bananas", carbonScore: 1.8 },
          { name: "Cheddar Cheese", carbonScore: 9.7 },
          { name: "Rice", carbonScore: 3.2 },
        ],
      };

      setResult(normalizePayload(mockResponse));
    } finally {
      setLoading(false);
    }
  }, []);

  //   const upload = useCallback(async (uri) => {
  //     try {
  //       setLoading(true);
  //       setResult(null);

  //       // build multipart form
  //       const form = new FormData();
  //       form.append("file", {
  //         uri,
  //         name: "receipt.jpg",
  //         type: "image/jpeg",
  //       });

  //       // if your API needs extra fields:
  //       // form.append("userId", "123");
  //       // form.append("source", "mobile-app");

  //       const resp = await fetch(API_URL, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "multipart/form-data",
  //         },
  //         body: form,
  //       });

  //       if (!resp.ok) {
  //         const txt = await resp.text();
  //         throw new Error(`Upload failed: ${resp.status} ${txt}`);
  //       }
  //       const data = await resp.json();

  //       // Expected shape:
  //       // {
  //       //   overallScore: number,
  //       //   items: [{ name: string, carbonScore: number }, ...],
  //       //   store?: string,
  //       // }
  //       setResult(normalizePayload(data));
  //     } catch (e) {
  //       console.log(e);
  //       Alert.alert("Error", e.message || "Failed to analyze receipt.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   }, []);

  const reset = useCallback(() => {
    setImageUri(null);
    setResult(null);
  }, []);

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
        {/* Header */}
        <View style={styles.headerPill}>
          <Text style={styles.headerTitle}>Shopping Scanner</Text>
          <Text style={styles.headerSub}>Upload or capture a receipt</Text>
        </View>

        {/* Actions */}
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
            <Text style={styles.ctaText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {imageUri && !loading && !result && (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Text style={styles.previewHint}>Analyzing…</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#CDE8FF" />
            <Text style={styles.loadingText}>Scanning your receipt…</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsWrap}>
            {/* Top: Score Donut + store tag */}
            <View style={styles.scoreWrap}>
              <ScoreDonut
                score={result.overallScore} // 0–100
                size={160}
                strokeWidth={14}
              />
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
                    {gradeLabel(result.overallScore)}
                  </Text>
                </LinearGradient>
                <Text style={styles.metaHint}>
                  Lower is better. Keep shopping smart to improve your
                  footprint.
                </Text>
              </View>
            </View>

            {/* Bubbles: items by impact */}
            <View style={styles.bubblesCard}>
              <Text style={styles.sectionTitle}>Top Impact Items</Text>
              <ItemBubbles items={result.items} />
            </View>

            {/* Equivalents / CTA */}
            <View style={styles.bottomRow}>
              <EquivalentsPill score={result.overallScore} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
                <Text style={styles.secondaryBtnText}>Scan another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- helpers / components ---------- */

function normalizePayload(data) {
  // Flexible normalizer to handle varied server shapes
  const overall =
    typeof data.overallScore === "number"
      ? clamp(data.overallScore, 0, 100)
      : toPercent(data.totalEmissions, data.maxEmissions); // fallback if needed

  const items = Array.isArray(data.items)
    ? data.items
        .map((it) => ({
          name: it.name ?? "Item",
          carbonScore:
            typeof it.carbonScore === "number"
              ? it.carbonScore
              : typeof it.emission === "number"
              ? it.emission
              : 0,
        }))
        .sort((a, b) => b.carbonScore - a.carbonScore)
    : [];

  return {
    overallScore: overall ?? 0,
    items,
    store: data.store ?? data.merchant ?? "",
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
  if (score <= 20) return "A+";
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
          stroke="#edae49"
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
      <View style={StyleSheet.absoluteFillObject} />
      <Text style={styles.donutValue}>{clamped}</Text>
      <Text style={styles.donutLabel}>Overall</Text>
    </View>
  );
}

/* Bubbles */
function ItemBubbles({ items = [] }) {
  // take top 8 by impact
  const top = useMemo(() => items.slice(0, 8), [items]);
  const max = useMemo(
    () => Math.max(1, ...top.map((i) => i.carbonScore || 0)),
    [top]
  );

  return (
    <View style={styles.bubblesWrap}>
      {top.map((it, idx) => {
        const weight = (it.carbonScore || 0) / max; // 0..1
        const size = 54 + Math.round(54 * weight); // 54..108
        const bg = `rgba(209,73,91,${0.22 + 0.4 * weight})`; // amaranth tint
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

/* Equivalents pill (simple heuristic) */
function EquivalentsPill({ score }) {
  // Treat score (0–100) as relative intensity to generate equivalents
  const miles = (score * 0.9).toFixed(0);
  const trees = Math.max(0.1, score / 40).toFixed(2);

  return (
    <LinearGradient
      colors={["#00798c", "#003d5b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.eqPill}
    >
      <Text style={styles.eqTitle}>What this means</Text>
      <Text style={styles.eqLine}>🚗 ≈ {miles} miles driven</Text>
      <Text style={styles.eqLine}>🌳 ≈ {trees} trees/year to offset</Text>
    </LinearGradient>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  content: {
    paddingTop: 18,
    paddingBottom: 60,
    paddingHorizontal: 18,
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
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 4,
  },

  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
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
    marginBottom: 12,
  },
  preview: { width: "100%", height: 240, resizeMode: "cover" },
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
  },
  loadingText: {
    marginTop: 10,
    color: "#EAF4F6",
    fontWeight: "600",
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
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  metaHint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  donutValue: {
    position: "absolute",
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  donutLabel: {
    position: "absolute",
    marginTop: 34,
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },

  bubblesCard: {
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
    color: "#FFFFFF",
    fontSize: 11,
    textAlign: "center",
  },
  bubbleScore: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 2,
  },

  bottomRow: { gap: 10 },
  eqPill: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  eqTitle: { color: "#EAF4F6", fontWeight: "700", marginBottom: 4 },
  eqLine: { color: "rgba(255,255,255,0.9)", fontSize: 12 },

  secondaryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700" },
});
