// TransportationSetup.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function Transportation() {
  return (
    <View style={styles.container}>
      <Text style={styles.h}>Transportation</Text>
      <Text style={styles.t}>
        Enable GPS trip auto-tracking and privacy settings.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#003d5b", padding: 20 },
  h: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  t: { color: "rgba(255,255,255,0.9)" },
});
