import React from "react";
import { View, Text } from "react-native";
import { transportStyles } from "../styles/theme";

export default function Transportation() {
  return (
    <View style={transportStyles.container}>
      <Text style={transportStyles.h}>Transportation</Text>
      <Text style={transportStyles.t}>
        Enable GPS trip auto-tracking and privacy settings.
      </Text>
    </View>
  );
}
