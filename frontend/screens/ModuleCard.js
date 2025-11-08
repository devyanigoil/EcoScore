import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";

export default function ModuleCard({
  icon,
  title,
  subtitle,
  enabled,
  onPress,
}) {
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !enabled && styles.cardDisabled,
        pressed && enabled && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={`${title}${enabled ? "" : ", coming soon"}`}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, !enabled && styles.dim]}>{title}</Text>
      </View>
      <Text style={[styles.subtitle, !enabled && styles.dim]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.14)", // fits ocean theme
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },
  cardDisabled: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icon: { fontSize: 16, marginRight: 8 },
  title: { color: "#EAF4F6", fontWeight: "700", fontSize: 16 },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: 13 },
  dim: { opacity: 0.6 },
});
