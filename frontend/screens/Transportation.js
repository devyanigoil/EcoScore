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
import { LinearGradient } from "expo-linear-gradient";
import { baseStyles, homeStyles, COLORS } from "../styles/theme";
import { useRoute } from "@react-navigation/native";
import { resolveApiBase } from "./functions";
import History from "./PastReceipts"

const API_IMAGE_URL = `${resolveApiBase()}/ocr/transport/upload`;
const API_PDF_URL = `${resolveApiBase()}/ocr/transport/pdf`;

export default function Transportations() {
  const [imageUri, setImageUri] = useState(null);
  const [pdfName, setPdfName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Keep your visible options as-is; map to backend enum later
  const [carType, setCarType] = useState("Petrol");
  const [open, setOpen] = useState(false);
  const options = ["Petrol", "Diesel", "Electric", "Hybrid"];

  const { params } = useRoute();
  const userId = params?.userId;

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

  /** ---------- Helpers ---------- */

  function fmt(val, fallback = "—") {
    if (val === null || val === undefined || val === "") return fallback;
    return String(val);
  }
  function fmtMiles(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return "—";
    return `${Number(n).toFixed(2)} mi`;
  }
  function fmtMinutes(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return "—";
    return `${Number(n)} min`;
  }
  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return "—";
    return `$${Number(n).toFixed(2)}`;
  }
  function fmtCO2(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return "—";
    // keep unit as provided by your backend semantics; adjust label if needed
    return `${Number(n).toFixed(3)}`;
  }

  function RowBlock({ label, value }) {
    return (
      <View style={styles.blockRow}>
        <Text style={styles.blockLabel}>{label}</Text>
        <Text style={styles.blockValue}>{value}</Text>
      </View>
    );
  }

  function TransportDetails({ data }) {
    return (
      <View style={styles.blocksWrap}>
        <RowBlock label="Provider" value={fmt(data.provider)} />
        <RowBlock label="Date" value={fmt(data.date)} />
        {/* <RowBlock label="Start Time" value={fmt(data.startTime)} />
        <RowBlock label="End Time" value={fmt(data.endTime)} />
        <RowBlock label="Pickup" value={fmt(data.pickup)} />
        <RowBlock label="Dropoff" value={fmt(data.dropoff)} /> */}
        <RowBlock label="Distance" value={fmtMiles(data.distance_miles)} />
        <RowBlock label="Duration" value={fmtMinutes(data.duration_min)} />
        <RowBlock label="Fare" value={fmtMoney(data.price_total)} />
        <RowBlock label="Vehicle" value={fmt(data.vehicle_type)} />
        <RowBlock
          label="Carbon Footprint"
          value={fmtCO2(data.carbonFootPrint)}
        />
      </View>
    );
  }

  // Map visible selection -> backend enum (gasoline | hybrid | electric)
  function normalizeVehicleType(label) {
    const l = (label || "").toLowerCase();
    if (l === "electric") return "electric";
    if (l === "hybrid") return "hybrid";
    // Treat Petrol/Diesel as gasoline unless you add diesel support server-side
    return "gasoline";
  }

  function guessMimeFromUri(uri, fallback = "application/octet-stream") {
    const ext = uri.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "pdf") return "application/pdf";
    return fallback;
  }

  function filenameFromUri(uri, fallback = "upload") {
    try {
      const seg = uri.split("/").pop();
      if (seg) return seg;
      return fallback;
    } catch {
      return fallback;
    }
  }

  async function appendWebFile(form, field, uri, name, type) {
    // Web needs Blob/File
    const res = await fetch(uri);
    const blob = await res.blob();
    const file = new File([blob], name, {
      type: type || blob.type || "application/octet-stream",
    });
    form.append(field, file);
  }

  function appendNativeFile(form, field, uri, name, type) {
    form.append(field, { uri, name, type });
  }

  async function postMultipart(url, form) {
    // Do NOT set explicit Content-Type with boundary; let fetch/React Native handle it
    const r = await fetch(url, { method: "POST", body: form });
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      throw new Error(`HTTP ${r.status}: ${msg || "Request failed"}`);
    }
    return r.json();
  }

  function toUiResult(api) {
    // Your UI expects { overallScore, items[], source, ... }
    // Backend returns the atomic transport record. Compute a normalized shape for display.
    const overall = Number(api?.carbonFootPrint ?? 0);
    const items = [
      {
        name: api?.provider || "Ride",
        carbonScore: Number(api?.carbonFootPrint ?? 0),
      },
    ];
    return {
      overallScore: isFinite(overall) ? Math.max(0, Math.round(overall)) : 0,
      items,
      source: `${api?.provider || "Transport"} • ${api?.date || ""}`.trim(),
      details: {
        date: api?.date,
        startTime: api?.startTime,
        endTime: api?.endTime,
        pickup: api?.pickup,
        dropoff: api?.dropoff,
        distance_miles: api?.distance_miles,
        duration_min: api?.duration_min,
        price_total: api?.price_total,
        vehicle_type: api?.vehicle_type,
      },
      cleaned_text: api?.cleaned_text,
    };
  }

  /** ---------- Pickers ---------- */

  const pickImage = useCallback(async () => {
    if (!(await askMediaPerms())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res?.canceled) return;
    const uri = res?.assets?.[0]?.uri;
    if (!uri) return;

    setImageUri(uri);
    setPdfName(null);
    setResult(null);

    try {
      setLoading(true);
      const form = new FormData();
      const vt = normalizeVehicleType(carType);
      form.append("vehicle_type", vt);
      form.append("return_cleaned", "false");
      form.append("userId", String(userId));

      const name = filenameFromUri(uri, "image.jpg");
      const type = guessMimeFromUri(uri, "image/jpeg");

      if (Platform.OS === "web") {
        await appendWebFile(form, "image", uri, name, type);
      } else {
        appendNativeFile(form, "image", uri, name, type);
      }

      const data = await postMultipart(API_IMAGE_URL, form);
      // setResult(toUiResult(data));
      setResult(data);
    } catch (e) {
      console.log(e);
      Alert.alert("Upload failed", String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [carType]);

  const pickPdf = useCallback(async () => {
    try {
      if (!(await askMediaPerms())) return;

      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      // Newer Expo returns {assets:[{uri,name,mimeType}]}; older returns {uri,name,mimeType,type}
      const doc = Array.isArray(res?.assets) ? res.assets[0] : res;
      if (!doc || doc.type === "cancel") return;

      const uri = doc.uri;
      const name = doc.name || filenameFromUri(uri, "document.pdf");
      const mime = doc.mimeType || guessMimeFromUri(uri, "application/pdf");

      setPdfName(name);
      setImageUri(null);
      setResult(null);

      setLoading(true);
      const form = new FormData();
      const vt = normalizeVehicleType(carType);
      form.append("vehicle_type", vt);
      form.append("return_cleaned", "false");
      form.append("userId", String(userId));

      if (Platform.OS === "web") {
        await appendWebFile(form, "pdf", uri, name, mime);
      } else {
        appendNativeFile(form, "pdf", uri, name, mime);
      }

      const data = await postMultipart(API_PDF_URL, form);
      console.log(data);
      // setResult(toUiResult(data));
      setResult(data);
    } catch (e) {
      console.log(e);
      Alert.alert("PDF upload failed", String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [carType]);

  const reset = useCallback(() => {
    setImageUri(null);
    setPdfName(null);
    setResult(null);
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
        <View style={styles.headerPill}>
          <Text style={styles.headerTitle}>Transportation Analyzer</Text>
          <Text style={styles.headerSub}>
            Upload Uber history to measure impact
          </Text>
        </View>

        {/* Car Type Dropdown */}
        {!result && !loading && (
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
        )}

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

        {!imageUri && !pdfName ? <History userId={userId} type="transport"/> : null}

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
              <View style={styles.scoreMeta}>
                <LinearGradient
                  colors={["#edae49", "#d1495b"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    Total: {result.carbonFootPrint} kg CO₂e
                  </Text>
                </LinearGradient>
                <Text style={styles.metaHint}>
                  Lower is better. Plan smarter travel to reduce emissions.
                </Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Details</Text>
              <TransportDetails data={result} />
            </View>

            {/* <View style={styles.bubblesCard}>
              <Text style={styles.sectionTitle}>Top Impact Ride Types</Text>
              <ItemBubbles items={result.items} />
            </View> */}

            <View style={styles.bottomRow}>
              {/* <EquivalentsPill score={result.overallScore} /> */}
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

/* -------- Helper Components (unchanged) -------- */

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
      <Text style={styles.donutValue}>{clamped}</Text>
      <Text style={styles.donutLabel}>Overall</Text>
    </View>
  );
}

function ItemBubbles({ items = [] }) {
  const top = useMemo(() => items.slice(0, 8), [items]);
  const max = useMemo(
    () => Math.max(1, ...top.map((i) => i.carbonScore || 0)),
    [top]
  );

  return (
    <View style={styles.bubblesWrap}>
      {top.map((it, idx) => {
        const weight = (it.carbonScore || 0) / max;
        const size = 54 + Math.round(54 * weight);
        const bg = `rgba(209,73,91,${0.22 + 0.4 * weight})`;
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

/* ---------- Styles (unchanged) ---------- */
const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 60, paddingHorizontal: 18 },
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
  headerTitle: { color: "#EAF4F6", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
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
  loadingText: { marginTop: 10, color: "#EAF4F6", fontWeight: "600" },
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
  storeTag: { color: "#CDE8FF", fontWeight: "700", marginBottom: 6 },
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
  bubblesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bubble: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleName: { color: "#FFFFFF", fontSize: 11, textAlign: "center" },
  bubbleScore: { color: "#fff", fontWeight: "700", fontSize: 12, marginTop: 2 },
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
  halfBtn: { flex: 1, marginHorizontal: 4 },
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
  detailsCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
  },

  blocksWrap: {
    marginTop: 6,
    gap: 8, // row-wise stacking
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
  },

  blockValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
