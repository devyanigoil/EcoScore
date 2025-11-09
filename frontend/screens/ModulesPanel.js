import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ModuleCard from "./ModuleCard";

export default function ModulesPanel({ modules, onSelect }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerPill}>
        <Text style={styles.headerText}>Tracking{"\n"}Modules</Text>
      </View>

      {modules.map((m) => (
        <ModuleCard
          key={m.key}
          icon={m.icon}
          title={m.title}
          subtitle={m.enabled ? m.subtitle : "Coming soon"}
          enabled={m.enabled}
          onPress={() => m.enabled && onSelect?.(m.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  headerPill: {
    borderRadius: 16,
    backgroundColor: "rgba(130,106,237,0.95)", // violet in your gradient family
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 12,
  },
  headerText: {
    color: "#F6FAFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
});
