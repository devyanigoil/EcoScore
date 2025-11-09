// TransportationSetup.js
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Svg, { Circle } from "react-native-svg";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { oceanSunsetNeumorphicStyles as base } from "../colorThemes";

export default function Transportations() {
  const [imageUri, setImageUri] = useState(null);
  const [pdfName, setPdfName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [carType, setCarType] = useState("Petrol");
  const [open, setOpen] = useState(false);
  const options = ["Petrol", "Diesel", "Electric"];

  const select = (val) => {
    setCarType(val);
    setOpen(false);
  };

  /** ---------- Permissions ---------- */
  const askMediaPerms = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow library access to upload files.");
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

  /** ---------- Upload Image (Uber screenshot) ---------- */
  const pickImage = useCallback(async () => {
    if (!(await askMediaPerms())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
      simulateAnalysis("image");
    }
  }, []);

  /** ---------- Upload PDF (Uber Ride History) ---------- */
  const pickPdf = useCallback(async () => {
    try {
      if (!(await askMediaPerms())) return;

      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (res.type === "cancel") return;

      setPdfName(res.name);
      simulateAnalysis("pdf");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Couldn't read PDF.");
    }
  }, []);

  /** ---------- Simulated API Call ---------- */
  const simulateAnalysis = (sourceType) => {
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      setLoading(false);

      // Mocked results for UI demo
      setResult({
        overallScore: sourceType === "pdf" ? 62 : 48,
        items: [
          { name: "UberX", carbonScore: 12.4 },
          { name: "Uber Black", carbonScore: 17.9 },
          { name: "Uber Pool", carbonScore: 6.8 },
        ],
        source:
          sourceType === "pdf"
            ? "Uber Ride History (PDF)"
            : "Uber Ride Screenshot",
      });
    }, 1800);
  };

  const reset = useCallback(() => {
    setImageUri(null);
    setPdfName(null);
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
        <View style={styles.headerPill}>
          <Text style={styles.headerTitle}>Transportation Analyzer</Text>
          <Text style={styles.headerSub}>Upload Uber history to measure impact</Text>
        </View>

        {/* Car Type Dropdown */}
        {/* <CarTypeDropdown value={carType} onChange={setCarType} /> */}
        <View style={styles.container}>
      <Text style={styles.label}>Car Type</Text>

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.selected}>{carType}</Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setOpen(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => select(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
      
        {/* Actions */}
        {!result && !loading && (
  <View style={styles.row}>
    <TouchableOpacity
      style={[styles.cta, styles.ctaSecondary, styles.halfBtn]}
      onPress={pickImage}
    >
      <Text style={styles.ctaEmoji}>🖼️</Text>
      <Text style={styles.ctaText}>Upload Image</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.cta, styles.ctaSecondary, styles.halfBtn]}
      onPress={pickPdf}
    >
      <Text style={styles.ctaEmoji}>📄</Text>
      <Text style={styles.ctaText}>Upload PDF</Text>
    </TouchableOpacity>
  </View>
)}

        {/* Preview before analysis */}
        {(imageUri || pdfName) && !loading && !result && (
          <View style={styles.previewCard}>
            <Text style={styles.previewHint}>
              {imageUri ? "✅ Image selected" : `📄 ${pdfName}`}
            </Text>
            <Text style={styles.previewHint}>Analyzing your rides…</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#CDE8FF" />
            <Text style={styles.loadingText}>Calculating footprint…</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsWrap}>
            <View style={styles.scoreWrap}>
              <ScoreDonut score={result.overallScore} size={160} strokeWidth={14} />
              <View style={styles.scoreMeta}>
                <Text style={styles.storeTag}>🚙 {result.source}</Text>
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
                  Lower is better. Plan smarter travel to reduce emissions.
                </Text>
              </View>
            </View>

            {/* Ride Types & Impact */}
            <View style={styles.bubblesCard}>
              <Text style={styles.sectionTitle}>Top Impact Ride Types</Text>
              <ItemBubbles items={result.items} />
            </View>

            <View style={styles.bottomRow}>
              <EquivalentsPill score={result.overallScore} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
                <Text style={styles.secondaryBtnText}>Analyze again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* -------- Helper Components (same as Shopping) -------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function gradeLabel(score) {
  if (score <= 20) return "A+";
  if (score <= 35) return "A";
  if (score <= 50) return "B";
  if (score <= 70) return "C";
  return "D";
}

function ScoreDonut({ score = 0, size = 160, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp(score, 0, 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
      <Text style={styles.donutValue}>{clamped}</Text>
      <Text style={styles.donutLabel}>Overall</Text>
    </View>
  );
}

function ItemBubbles({ items = [] }) {
  const top = useMemo(() => items.slice(0, 8), [items]);
  const max = useMemo(() => Math.max(1, ...top.map((i) => i.carbonScore || 0)), [top]);

  return (
    <View style={styles.bubblesWrap}>
      {top.map((it, idx) => {
        const weight = (it.carbonScore || 0) / max;
        const size = 54 + Math.round(54 * weight);
        const bg = `rgba(209,73,91,${0.22 + 0.4 * weight})`;
        return (
          <View key={`${it.name}-${idx}`} style={[styles.bubble, { width: size, height: size, backgroundColor: bg }]}>
            <Text style={styles.bubbleName} numberOfLines={2}>
              {it.name}
            </Text>
            <Text style={styles.bubbleScore}>{(it.carbonScore ?? 0).toFixed(1)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function EquivalentsPill({ score }) {
  const miles = (score * 1.4).toFixed(0);
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

/* ---------- Styles ---------- */

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
    paddingVertical: 12,
    marginTop: 12,
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  
  halfBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  container: { marginBottom: 14 },
  label: { color: "#EAF4F6", fontWeight: "600", marginBottom: 6 },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    height: 40,
  },
  selected: { color: "#fff" },
  arrow: { color: "#fff", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  modalContent: {
    backgroundColor: "rgba(30,30,30,0.95)",
    borderRadius: 12,
    overflow: "hidden",
  },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#444" },
  optionText: { color: "#fff", fontSize: 16 },
});
