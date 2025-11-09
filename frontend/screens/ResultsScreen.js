// screens/ResultsScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);

export default function ResultsScreen({ route, navigation }) {
  const { breakdown, total, inputs } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Estimated Annual Footprint</Text>
      <Text style={styles.total}>{fmt(total)} tCO₂e / year</Text>

      <View style={styles.card}>
        <Text style={styles.row}>
          <Text style={styles.key}>Electricity: </Text>
          <Text style={styles.val}>{fmt(breakdown.electricity)} tCO₂e/yr</Text>
        </Text>
        <Text style={styles.row}>
          <Text style={styles.key}>Transport: </Text>
          <Text style={styles.val}>{fmt(breakdown.transport)} tCO₂e/yr</Text>
        </Text>
        <Text style={styles.row}>
          <Text style={styles.key}>Diet: </Text>
          <Text style={styles.val}>{fmt(breakdown.diet)} tCO₂e/yr</Text>
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.subheading}>Inputs</Text>
        <Text style={styles.inputRow}>
          Electricity: {inputs.kwhMonthly} kWh/month
        </Text>
        <Text style={styles.inputRow}>
          Driving: {inputs.milesPerWeek} miles/week
        </Text>
        <Text style={styles.inputRow}>Fuel economy: {inputs.mpg} mpg</Text>
        <Text style={styles.inputRow}>Diet: {inputs.diet}</Text>
      </View>

      <TouchableOpacity style={styles.cta} onPress={() => navigation.goBack()}>
        <Text style={styles.ctaText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 20, fontWeight: "700" },
  total: { fontSize: 28, fontWeight: "800", marginTop: 6 },
  card: {
    backgroundColor: "#f6f6f8",
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
  },
  row: { fontSize: 16, marginBottom: 6 },
  key: { fontWeight: "700" },
  val: { fontWeight: "600" },
  subheading: { fontWeight: "700", marginBottom: 8 },
  inputRow: { fontSize: 14, marginBottom: 4 },
  cta: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#232323",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
