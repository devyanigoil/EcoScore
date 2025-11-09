// PastReceipts.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { resolveApiBase } from "./functions";

export default function History({ userId, type }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  const API_URL = `${resolveApiBase()}/summary`;

  const ICONS = {
    transport: "🚗",
    energy: "⚡️",
    shopping: "🛍️",
  };

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const url = `${API_URL}?user_id=${encodeURIComponent(userId)}&type=${encodeURIComponent(type)}`;
        const response = await fetch(url, { method: "GET" });

        if (!response.ok) throw new Error("Failed to fetch receipts");
        const data = await response.json();

        setEntries(data.entries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, type]);

  // Format keys like "start_date" -> "Start Date"
  function prettifyKey(key) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function prettifyValue(key, value) {
    if (!value) return value;

    if (key.includes("date")) {
      const d = new Date(value);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    if (key === "emissions") return `${value} kg CO₂`;
    return value;
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#CDE8FF" />
        <Text style={styles.loadingText}>Loading data…</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>❌ {error}</Text>;
  }

  if (!entries.length) {
    return <Text style={styles.empty}>No past {type} receipts found.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Receipts</Text>

      <FlatList
        data={entries}
        keyExtractor={(_, idx) => idx.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.icon}>{ICONS[type] || "🧾"}</Text>

            <View style={{ flex: 1 }}>
              {Object.entries(item).map(([key, value]) => (
                <Text key={key} style={styles.line}>
                  <Text style={styles.label}>{prettifyKey(key)}: </Text>
                  {prettifyValue(key, value)}
                </Text>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  title: {
    color: "#EAF4F6",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 12,
    alignItems: "flex-start",
    gap: 12,
  },
  icon: { fontSize: 26, marginTop: 2 },
  label: { color: "#fff", fontWeight: "700", fontSize: 13 },
  line: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 3 },
  empty: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 14 },
  error: { color: "#ff6b6b", textAlign: "center", marginTop: 14 },
  loadingWrap: { alignItems: "center", marginTop: 12 },
  loadingText: { color: "#EAF4F6", marginTop: 6 },
});
