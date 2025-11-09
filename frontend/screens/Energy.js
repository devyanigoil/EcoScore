import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import Constants from "expo-constants";
import { baseStyles, scannerStyles, COLORS } from "../styles/theme";
import { useRoute } from "@react-navigation/native";
import { resolveApiBase } from "./functions";

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
        form.append("pdf", {
          uri: fileMeta.uri,
          name: fileMeta.name || "bill.pdf",
          type: fileMeta.mimeType || "application/pdf",
        });
        form.append("userId", String(userId));

        console.log("Just before hitting the api");
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
    [API_URL]
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
        contentContainerStyle={scannerStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={scannerStyles.headerPill}>
          <Text style={scannerStyles.headerTitle}>Energy Bill Scanner</Text>
          <Text style={scannerStyles.headerSub}>Upload a PDF utility bill</Text>
        </View>

        {/* Actions */}
        <View style={scannerStyles.row}>
          <TouchableOpacity
            style={[scannerStyles.cta, scannerStyles.ctaPrimary]}
            onPress={pickPdf}
          >
            <Text style={scannerStyles.ctaEmoji}>📄</Text>
            <Text style={scannerStyles.ctaText}>Choose PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[scannerStyles.cta, scannerStyles.ctaSecondary]}
            onPress={reset}
          >
            <Text style={scannerStyles.ctaEmoji}>🔄</Text>
            <Text style={scannerStyles.ctaText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Preview (file meta) */}
        {doc && !loading && !result && (
          <View style={scannerStyles.previewCard}>
            <Text style={scannerStyles.previewTitle}>{doc.name}</Text>
            <Text style={scannerStyles.previewHint}>
              {doc.size ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB • ` : ""}
              {doc.mimeType}
            </Text>
            <Text style={scannerStyles.previewAnalyzing}>Analyzing…</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={scannerStyles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={scannerStyles.loadingText}>Reading your bill…</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={scannerStyles.resultsWrap}>
            {/* Top: Donut (days) + meta */}
            <View style={scannerStyles.scoreWrap}>
              <DaysDonut days={result.days} size={160} strokeWidth={14} />
              <View style={scannerStyles.scoreMeta}>
                {/* Only the billing period is known */}
                <Text style={scannerStyles.metaHint}>{result.periodLabel}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={scannerStyles.statsCol}>
              <StatCard label="Total kWh" value={fmtNum(result.totalKwh)} />
              <StatCard label="Avg kWh/day" value={fmtNum(result.avgPerDay)} />
              {result.carbonFootprint != null && (
                <StatCard
                  label="CO₂e (kg)"
                  value={fmtNum(result.carbonFootprint)}
                />
              )}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={scannerStyles.secondaryBtn}
              onPress={reset}
            >
              <Text style={scannerStyles.secondaryBtnText}>Scan another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ================= helpers / components ================= */

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
        ? `Billing period: ${fmtDate(start)} – ${fmtDate(end)} (${
            days ?? "—"
          } days)`
        : "Billing period",

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
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    v
  );
}

/** Donut showing length of billing period */
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
      <Text style={scannerStyles.donutValue}>{clamped}</Text>
      <Text style={scannerStyles.donutLabel}>Days</Text>
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={[scannerStyles.statCard, { width: "100%" }]}>
      <Text style={scannerStyles.statValue}>{value}</Text>
      <Text style={scannerStyles.statLabel}>{label}</Text>
    </View>
  );
}

function KV({ label, value }) {
  return (
    <View style={scannerStyles.kvRow}>
      <Text style={scannerStyles.kvLabel}>{label}</Text>
      <Text style={scannerStyles.kvValue} numberOfLines={3}>
        {value || "—"}
      </Text>
    </View>
  );
}
