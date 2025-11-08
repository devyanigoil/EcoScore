// screens/HomeScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const dietFactorsTonsPerYear = {
  omnivore: 2.5, // ~tCO2e/yr (coarse default)
  vegetarian: 1.7,
  vegan: 1.5,
};

export default function HomeScreen({ navigation }) {
  const [kwhMonthly, setKwhMonthly] = useState("250"); // electricity use per month
  const [milesPerWeek, setMilesPerWeek] = useState("60"); // driving miles per week
  const [mpg, setMpg] = useState("28"); // vehicle fuel economy
  const [diet, setDiet] = useState("omnivore"); // omnivore | vegetarian | vegan

  const onCalculate = () => {
    const kwh = Math.max(0, parseFloat(kwhMonthly) || 0);
    const miles = Math.max(0, parseFloat(milesPerWeek) || 0);
    const mpgVal = Math.max(1, parseFloat(mpg) || 1); // avoid divide-by-zero

    // --- Electricity ---
    // US avg grid ~0.417 kg CO2e / kWh (rough figure). Convert to tCO2e/year.
    const elec_kg_per_month = kwh * 0.417;
    const elec_tons_per_year = (elec_kg_per_month * 12) / 1000;

    // --- Transport ---
    // Tailpipe: 8.887 kg CO2e per gallon gasoline
    const gallonsPerWeek = miles / mpgVal;
    const trans_kg_per_week = gallonsPerWeek * 8.887;
    const trans_tons_per_year = (trans_kg_per_week * 52) / 1000;

    // --- Diet ---
    const diet_tons_per_year =
      dietFactorsTonsPerYear[diet] ?? dietFactorsTonsPerYear.omnivore;

    const total = elec_tons_per_year + trans_tons_per_year + diet_tons_per_year;

    navigation.navigate("Results", {
      breakdown: {
        electricity: elec_tons_per_year,
        transport: trans_tons_per_year,
        diet: diet_tons_per_year,
      },
      total,
      inputs: { kwhMonthly: kwh, milesPerWeek: miles, mpg: mpgVal, diet },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <Text style={styles.h1}>Estimate your annual footprint</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Electricity use (kWh / month)</Text>
        <TextInput
          value={kwhMonthly}
          onChangeText={setKwhMonthly}
          keyboardType="numeric"
          placeholder="e.g., 250"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>
          Driving (miles / week)
        </Text>
        <TextInput
          value={milesPerWeek}
          onChangeText={setMilesPerWeek}
          keyboardType="numeric"
          placeholder="e.g., 60"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>
          Vehicle fuel economy (mpg)
        </Text>
        <TextInput
          value={mpg}
          onChangeText={setMpg}
          keyboardType="numeric"
          placeholder="e.g., 28"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Diet</Text>
        <View style={styles.segment}>
          {["omnivore", "vegetarian", "vegan"].map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setDiet(key)}
              style={[
                styles.segmentBtn,
                diet === key && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  diet === key && styles.segmentTextActive,
                ]}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cta} onPress={onCalculate}>
          <Text style={styles.ctaText}>Calculate</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  card: { backgroundColor: "#f6f6f8", borderRadius: 12, padding: 16 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e3e3e8",
  },
  segment: { flexDirection: "row", gap: 8, marginTop: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d7d7dd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentBtnActive: { backgroundColor: "#2f6fff15", borderColor: "#2f6fff" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#333" },
  segmentTextActive: { color: "#2f6fff" },
  cta: {
    marginTop: 16,
    backgroundColor: "#2f6fff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
