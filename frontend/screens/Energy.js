import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { baseStyles, COLORS } from "../styles/theme";
import { useRoute } from "@react-navigation/native";
import { resolveApiBase } from "./functions";
import History from "./PastReceipts";

const API_URL = `${resolveApiBase()}/ocr/energy/pdf`;

export default function Energy() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { params } = useRoute();
  const userId = params?.userId;

  const pickPdf = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
        copyToCacheDirectory: true,
      });
      
      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      const meta = {
        uri: asset.uri,
        name: asset.name || "bill.pdf",
        size: asset.size ?? null,
        mimeType: asset.mimeType || "application/pdf",
      };
      
      setDoc(meta);
      setResult(null);
      await upload(meta);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to pick a PDF.");
    }
  }, []);

  const upload = useCallback(
    async (fileMeta) => {
      try {
        setLoading(true);
        setResult(null);

        const form = new FormData();
        
        if (Platform.OS === "web") {
          // Web needs Blob/File
          const response = await fetch(fileMeta.uri);
          const blob = await response.blob();
          const file = new File([blob], fileMeta.name, {
            type: fileMeta.mimeType || "application/pdf",
          });
          form.append("pdf", file);
        } else {
          // Native
          form.append("pdf", {
            uri: fileMeta.uri,
            name: fileMeta.name || "bill.pdf",
            type: fileMeta.mimeType || "application/pdf",
          });
        }
        
        form.append("userId", String(userId));

        console.log("Uploading energy bill...");
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
        setResult(normalizePayload(data));
      } catch (e) {
        console.log(e);
        Alert.alert("Error", e.message || "Failed to analyze PDF.");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const reset = useCallback(() => {
    setDoc(null);
    setResult(null);
  }, []);

  return (
    <View style={baseStyles.container}>
      {/* Background */}
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
          <Text style={styles.headerTitle}>Energy Bill Analyzer</Text>
          <Text style={styles.headerSub}>Upload a PDF utility bill to track your energy usage</Text>
        </View>

        {/* Actions */}
        {!result && !loading && (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.cta, styles.ctaPrimary]}
              onPress={pickPdf}
            >
              <Text style={styles.ctaEmoji}>📄</Text>
              <Text style={styles.ctaText}>Upload PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, styles.ctaSecondary]}
              onPress={reset}
            >
              <Text style={styles.ctaEmoji}>🔄</Text>
              <Text style={styles.ctaText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {!doc ? <History userId={userId} type="energy" /> : null}

        {/* Preview (file meta) */}
        {doc && !loading && !result && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{doc.name}</Text>
            <Text style={styles.previewHint}>
              {doc.size ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB • ` : ""}
              {doc.mimeType}
            </Text>
            <Text style={styles.previewHint}>Analyzing your energy bill…</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Reading your bill…</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsWrap}>
            {/* Top: Badge + meta */}
            <View style={styles.scoreWrap}>
              <View style={styles.scoreMeta}>
                <LinearGradient
                  colors={["#edae49", "#d1495b"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    Total: {fmtNum(result.totalKwh)} kWh
                  </Text>
                </LinearGradient>
                <Text style={styles.metaHint}>{result.periodLabel}</Text>
                <Text style={styles.metaHint}>
                  Lower usage means reduced emissions and costs
                </Text>
              </View>
            </View>

            {/* Stats in detail card format */}
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Usage Summary</Text>
              <View style={styles.blocksWrap}>
                <RowBlock label="Billing Period" value={result.periodLabel} />
                <RowBlock label="Total Days" value={result.days ? `${result.days} days` : "—"} />
                <RowBlock label="Total kWh" value={fmtNum(result.totalKwh)} />
                <RowBlock label="Avg kWh/day" value={fmtNum(result.avgPerDay)} />
                {result.carbonFootprint != null && (
                  <RowBlock
                    label="CO₂e Emissions"
                    value={`${fmtNum(result.carbonFootprint)} kg`}
                  />
                )}
              </View>
            </View>

            {/* Environmental Impact */}
            {result.carbonFootprint != null && (
              <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Environmental Impact</Text>
                <View style={styles.blocksWrap}>
                  <RowBlock 
                    label="Carbon Footprint" 
                    value={`${fmtNum(result.carbonFootprint)} kg CO₂e`} 
                  />
                  <RowBlock 
                    label="Equivalent Miles Driven" 
                    value={`${fmtNum(result.carbonFootprint * 1.4)} mi`} 
                  />
                  <RowBlock 
                    label="Trees to Offset (yearly)" 
                    value={fmtNum(Math.max(0.1, result.carbonFootprint / 40))} 
                  />
                </View>
              </View>
            )}

            {/* Donut visualization */}
            {result.days && (
              <View style={styles.visualCard}>
                <Text style={styles.sectionTitle}>Billing Period</Text>
                <View style={styles.donutCenter}>
                  <DaysDonut days={result.days} size={160} strokeWidth={14} />
                </View>
              </View>
            )}

            {/* CTA */}
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={reset}
              >
                <Text style={styles.secondaryBtnText}>Analyze another bill</Text>
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

function DaysDonut({ days = 0, size = 160, strokeWidth = 14 }) {
  const maxDays = 31;
  const clamped = Math.max(0, Math.min(days || 0, maxDays));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / maxDays) * circumference;

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
      <Text style={styles.donutValue}>{clamped}</Text>
      <Text style={styles.donutLabel}>Days</Text>
    </View>
  );
}

/* ================= Helpers ================= */

function normalizePayload(data) {
  const totalKwh = num(data?.energy);
  const start = data?.startDate ? new Date(data.startDate) : null;
  const end = data?.endDate ? new Date(data.endDate) : null;

  const days = start && end ? diffDays(start, end) : null;
  const avgPerDay = days && totalKwh != null ? totalKwh / days : null;

  return {
    ok: true,
    // Period
    periodStart: start,
    periodEnd: end,
    days,
    periodLabel:
      start && end
        ? `${fmtDate(start)} – ${fmtDate(end)}`
        : "—",

    // Energy
    totalKwh,
    avgPerDay,

    // Carbon
    carbonFootprint: num(data?.carbonFootPrint),
  };
}

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function diffDays(a, b) {
  if (!(a && b)) return null;
  const ms = Math.abs(b - a);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function fmtDate(d) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(d);
  }
}

function fmtNum(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
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
    paddingHorizontal: 16,
    marginTop: 12,
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
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
  visualCard: {
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
  },
  blockValue: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  donutCenter: {
    alignItems: "center",
    marginTop: 10,
  },
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