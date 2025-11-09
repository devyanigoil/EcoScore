import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import Constants from "expo-constants";
import { oceanSunsetNeumorphicStyles as base } from "../colorThemes";

/** ===== API host resolution (match your Shopping screen’s approach) ===== */
function resolveApiBase() {
  // Prefer tunnel if you use one:
  // return "https://<your-subdomain>.ngrok.io";
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  const baseHost = host || "192.168.0.42"; // <-- replace with your Mac's Wi-Fi IP if needed
  return `http://${baseHost}:8001`;
}
const API_URL = `${resolveApiBase()}/ocr/energy/pdf`; // <-- your backend route

export default function Energy() {
  const [doc, setDoc] = useState(null); // { uri, name, size, mimeType }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /** ---- pick PDF ---- */
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
      await upload(meta);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to pick a PDF.");
    }
  }, []);

  /** ---- mock switch ---- */
  const USE_MOCK = false;

  /** ---- upload ---- */
  const upload = useCallback(
    async (fileMeta) => {
      try {
        setLoading(true);
        setResult(null);

        const form = new FormData();
        form.append("pdf", {
          uri: fileMeta.uri,
          name: fileMeta.name || "bill.pdf",
          type: fileMeta.mimeType || "application/pdf",
        });

        const resp = await fetch(API_URL, {
          method: "POST",
          // DO NOT set Content-Type; let RN set the boundary
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
    [API_URL]
  );

  const reset = useCallback(() => {
    setDoc(null);
    setResult(null);
  }, []);

  return (
    <View style={base.container}>
      {/* Background */}
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
          <Text style={styles.headerTitle}>Energy Bill Scanner</Text>
          <Text style={styles.headerSub}>Upload a PDF utility bill</Text>
        </View>

        {/* Actions */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.cta, styles.ctaPrimary]}
            onPress={pickPdf}
          >
            <Text style={styles.ctaEmoji}>📄</Text>
            <Text style={styles.ctaText}>Choose PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, styles.ctaSecondary]}
            onPress={reset}
          >
            <Text style={styles.ctaEmoji}>🔄</Text>
            <Text style={styles.ctaText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Preview (file meta) */}
        {doc && !loading && !result && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{doc.name}</Text>
            <Text style={styles.previewHint}>
              {doc.size ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB • ` : ""}
              {doc.mimeType}
            </Text>
            <Text style={styles.previewAnalyzing}>Analyzing…</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#CDE8FF" />
            <Text style={styles.loadingText}>Reading your bill…</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsWrap}>
            {/* Top: Donut (days coverage) + meta */}
            <View style={styles.scoreWrap}>
              <DaysDonut days={result.days} size={160} strokeWidth={14} />
              <View style={styles.scoreMeta}>
                <Text style={styles.storeTag}>
                  {result.utilityName || "Utility"} • {result.zipCode || "ZIP"}
                </Text>

                <LinearGradient
                  colors={["#edae49", "#d1495b"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    {result.netMetering ? "Net Metering" : "Standard"}
                  </Text>
                </LinearGradient>

                <Text style={styles.metaHint}>{result.periodLabel}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard label="Total kWh" value={fmtNum(result.totalKwh)} />
              <StatCard label="Avg kWh/day" value={fmtNum(result.avgPerDay)} />
            </View>

            {/* Supplier */}
            <View style={styles.bubblesCard}>
              <Text style={styles.sectionTitle}>Supplier Details</Text>
              <View style={styles.kvWrap}>
                <KV label="Name" value={result.supplierName || "—"} />
                <KV label="Plan" value={result.supplierPlan || "—"} />
                <KV label="Green Attribute" value={result.greenAttr || "—"} />
                <KV label="Accounting" value={result.accountingMethod || "—"} />
              </View>
            </View>

            {/* Service address */}
            {result.serviceAddress ? (
              <LinearGradient
                colors={["#00798c", "#003d5b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.eqPill}
              >
                <Text style={styles.eqTitle}>Service Address</Text>
                <Text style={styles.eqLine}>{result.serviceAddress}</Text>
              </LinearGradient>
            ) : null}

            {/* CTA */}
            <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
              <Text style={styles.secondaryBtnText}>Scan another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ================= helpers / components ================= */

function normalizePayload(data) {
  const e = data?.energy ?? {};
  const start = e.billing_period_start
    ? new Date(e.billing_period_start)
    : null;
  const end = e.billing_period_end ? new Date(e.billing_period_end) : null;

  const days = typeof e.days === "number" ? e.days : diffDays(start, end);
  const totalKwh = num(e.total_kwh);
  const avgPerDay = days ? totalKwh / days : null;

  return {
    ok: !!data?.ok,
    bytes: data?.bytes ?? null,

    utilityName: e.utility_name || "",
    zipCode: e.zip_code || "",
    serviceAddress: e.service_address || "",
    periodStart: start,
    periodEnd: end,
    days,

    totalKwh,
    avgPerDay,

    supplierName: e.supplier?.name || "",
    supplierPlan: e.supplier?.plan || "",
    greenAttr: e.supplier?.green_attributes || "",

    importKwh: num(e.onsite?.import_kwh),
    exportKwh: num(e.onsite?.export_kwh),
    netMetering: !!e.onsite?.net_metering,

    accountingMethod: e.accounting_method || "",
    periodLabel:
      start && end
        ? `Billing period: ${fmtDate(start)} – ${fmtDate(end)} (${days} days)`
        : days
        ? `Billing period: ${days} days`
        : "Billing period",
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
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    v
  );
}

/** Donut showing length of billing period (out of 31 for context) */
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
      <Text style={styles.donutLabel}>Days</Text>
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function KV({ label, value }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue} numberOfLines={3}>
        {value || "—"}
      </Text>
    </View>
  );
}

/* ================= styles ================= */

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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  previewTitle: { color: "#EAF4F6", fontWeight: "700", fontSize: 14 },
  previewHint: { color: "rgba(255,255,255,0.85)", marginTop: 4 },
  previewAnalyzing: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
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

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  statValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  statLabel: { color: "rgba(255,255,255,0.9)", marginTop: 2 },

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

  kvWrap: { gap: 10 },
  kvRow: { flexDirection: "row", gap: 8 },
  kvLabel: { color: "rgba(255,255,255,0.9)", width: 120 },
  kvValue: { color: "#FFFFFF", flex: 1 },

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
