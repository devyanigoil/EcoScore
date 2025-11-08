// // App.js - Carbon Receipt Scanner for React Native
// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Image,
//   ActivityIndicator,
//   StyleSheet,
//   Platform,
//   Alert,
//   SafeAreaView,
//   KeyboardAvoidingView,
// } from "react-native";
// import * as ImagePicker from "expo-image-picker";

// // IMPORTANT: Add your Anthropic API key here
// // Get your API key from: https://console.anthropic.com/
// const ANTHROPIC_API_KEY =
//   "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";

// const CarbonReceiptScanner = () => {
//   const [receipt, setReceipt] = useState(null);
//   const [analyzing, setAnalyzing] = useState(false);
//   const [results, setResults] = useState(null);
//   const [error, setError] = useState(null);
//   const [manualMode, setManualMode] = useState(false);
//   const [manualData, setManualData] = useState({
//     store: "",
//     items: [{ name: "", price: "", category: "other" }],
//   });

//   const storeSustainability = {
//     "whole foods": 4,
//     "trader joes": 4,
//     walmart: 2,
//     target: 3,
//     costco: 2,
//     kroger: 2,
//     safeway: 2,
//     sprouts: 4,
//     aldi: 3,
//     publix: 2,
//     default: 2.5,
//   };

//   const emissionFactors = {
//     beef: 27.0,
//     lamb: 39.2,
//     pork: 12.1,
//     chicken: 6.9,
//     fish: 6.0,
//     cheese: 13.5,
//     milk: 1.9,
//     eggs: 4.8,
//     rice: 2.7,
//     beans: 2.0,
//     vegetables: 2.0,
//     fruits: 1.1,
//     bread: 1.6,
//     pasta: 1.0,
//     coffee: 16.5,
//     chocolate: 19.0,
//     wine: 1.8,
//     beer: 0.9,
//     soda: 0.3,
//     snacks: 3.5,
//     frozen: 4.0,
//     processed: 5.0,
//     organic: 1.5,
//     plastic: 6.0,
//     electronics: 50.0,
//     clothing: 20.0,
//     cleaning: 3.0,
//     default: 3.0,
//   };

//   const categories = [
//     "beef",
//     "lamb",
//     "pork",
//     "chicken",
//     "fish",
//     "cheese",
//     "milk",
//     "eggs",
//     "vegetables",
//     "fruits",
//     "bread",
//     "rice",
//     "beans",
//     "pasta",
//     "coffee",
//     "chocolate",
//     "wine",
//     "beer",
//     "soda",
//     "snacks",
//     "frozen",
//     "processed",
//     "organic",
//     "clothing",
//     "electronics",
//     "cleaning",
//     "other",
//   ];

//   const showDemo = () => {
//     const demoData = {
//       store: "Whole Foods Market",
//       items: [
//         { name: "Organic Chicken Breast", price: 12.99, category: "chicken" },
//         { name: "Baby Spinach", price: 3.99, category: "vegetables" },
//         { name: "Grass-Fed Ground Beef", price: 15.99, category: "beef" },
//         { name: "Organic Bananas", price: 2.49, category: "fruits" },
//         { name: "Almond Milk", price: 4.99, category: "milk" },
//         { name: "Organic Eggs", price: 5.99, category: "eggs" },
//         { name: "Quinoa", price: 6.99, category: "rice" },
//         { name: "Cherry Tomatoes", price: 4.49, category: "vegetables" },
//       ],
//       total: 58.91,
//     };
//     calculateEmissions(demoData);
//   };

//   const requestPermissions = async () => {
//     if (Platform.OS !== "web") {
//       const { status } =
//         await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (status !== "granted") {
//         Alert.alert(
//           "Permission Denied",
//           "We need camera roll permissions to upload receipts"
//         );
//         return false;
//       }
//     }
//     return true;
//   };

//   const pickImage = async () => {
//     const hasPermission = await requestPermissions();
//     if (!hasPermission) return;

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       quality: 0.8,
//       base64: true,
//     });

//     if (!result.canceled && result.assets[0]) {
//       setReceipt(result.assets[0].uri);
//       analyzeReceipt(result.assets[0].base64, result.assets[0].uri);
//     }
//   };

//   const takePhoto = async () => {
//     const hasPermission = await requestPermissions();
//     if (!hasPermission) return;

//     const { status } = await ImagePicker.requestCameraPermissionsAsync();
//     if (status !== "granted") {
//       Alert.alert(
//         "Permission Denied",
//         "We need camera permissions to take photos"
//       );
//       return;
//     }

//     const result = await ImagePicker.launchCameraAsync({
//       allowsEditing: true,
//       quality: 0.8,
//       base64: true,
//     });

//     if (!result.canceled && result.assets[0]) {
//       setReceipt(result.assets[0].uri);
//       analyzeReceipt(result.assets[0].base64, result.assets[0].uri);
//     }
//   };

//   const analyzeReceipt = async (base64Data, uri) => {
//     // Check if API key is set
//     if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "YOUR_API_KEY_HERE") {
//       Alert.alert(
//         "API Key Required",
//         "Please add your Anthropic API key to the code. Get one at console.anthropic.com",
//         [
//           { text: "Use Manual Entry", onPress: () => setManualMode(true) },
//           { text: "Cancel", style: "cancel" },
//         ]
//       );
//       return;
//     }

//     setAnalyzing(true);
//     setError(null);

//     try {
//       const response = await fetch("https://api.anthropic.com/v1/messages", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": ANTHROPIC_API_KEY,
//           "anthropic-version": "2023-06-01",
//         },
//         body: JSON.stringify({
//           model: "claude-sonnet-4-20250514",
//           max_tokens: 2000,
//           messages: [
//             {
//               role: "user",
//               content: [
//                 {
//                   type: "image",
//                   source: {
//                     type: "base64",
//                     media_type: "image/jpeg",
//                     data: base64Data,
//                   },
//                 },
//                 {
//                   type: "text",
//                   text: `You are analyzing a shopping receipt. Extract ALL items you can see.

// Return ONLY valid JSON (no markdown, no backticks):
// {
//   "store": "store name or UNKNOWN",
//   "items": [
//     {"name": "item", "price": number, "category": "category"}
//   ],
//   "total": number
// }

// CATEGORIES: beef, lamb, pork, chicken, fish, cheese, milk, eggs, vegetables, fruits, bread, rice, beans, pasta, coffee, chocolate, wine, beer, soda, snacks, frozen, processed, organic, clothing, electronics, cleaning, other

// Return valid JSON only.`,
//                 },
//               ],
//             },
//           ],
//         }),
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("API Error:", response.status, errorText);

//         if (response.status === 401) {
//           throw new Error(
//             "Invalid API key. Please check your Anthropic API key."
//           );
//         } else if (response.status === 429) {
//           throw new Error("Rate limit exceeded. Please try again later.");
//         } else {
//           throw new Error(`API error: ${response.status}`);
//         }
//       }

//       const data = await response.json();
//       const text = data.content
//         .map((item) => (item.type === "text" ? item.text : ""))
//         .join("");

//       let cleanText = text
//         .trim()
//         .replace(/^```json\s*/i, "")
//         .replace(/^```\s*/i, "")
//         .replace(/```\s*$/i, "")
//         .trim();

//       const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         cleanText = jsonMatch[0];
//       }

//       const parsed = JSON.parse(cleanText);

//       if (!parsed.items || parsed.items.length === 0) {
//         throw new Error("No items found");
//       }

//       calculateEmissions(parsed);
//     } catch (error) {
//       console.error("Analysis error:", error);
//       setAnalyzing(false);
//       setError(`Could not read receipt. ${error.message}`);
//       Alert.alert(
//         "Scan Failed",
//         `${error.message}\n\nWould you like to enter items manually?`,
//         [
//           { text: "Cancel", style: "cancel" },
//           { text: "Manual Entry", onPress: () => setManualMode(true) },
//         ]
//       );
//     }
//   };

//   const handleManualSubmit = () => {
//     const validItems = manualData.items.filter(
//       (item) => item.name.trim() && item.price && !isNaN(parseFloat(item.price))
//     );

//     if (!manualData.store.trim()) {
//       Alert.alert("Error", "Please enter a store name");
//       return;
//     }

//     if (validItems.length === 0) {
//       Alert.alert("Error", "Please add at least one item with name and price");
//       return;
//     }

//     const total = validItems.reduce(
//       (sum, item) => sum + parseFloat(item.price),
//       0
//     );

//     const formattedData = {
//       store: manualData.store,
//       items: validItems.map((item) => ({
//         name: item.name,
//         price: parseFloat(item.price),
//         category: item.category,
//       })),
//       total: total,
//     };

//     calculateEmissions(formattedData);
//   };

//   const calculateEmissions = (data) => {
//     try {
//       const storeName = data.store.toLowerCase();
//       const storeRating = Object.keys(storeSustainability).find((key) =>
//         storeName.includes(key)
//       )
//         ? storeSustainability[
//             Object.keys(storeSustainability).find((key) =>
//               storeName.includes(key)
//             )
//           ]
//         : storeSustainability.default;

//       const storeFactor = (6 - storeRating) / 5;
//       let totalEmissions = 0;
//       let itemBreakdown = [];

//       data.items.forEach((item) => {
//         let baseEmission =
//           emissionFactors[item.category] || emissionFactors.default;
//         if (item.name.toLowerCase().includes("organic")) {
//           baseEmission *= 0.7;
//         }
//         const itemEmission = baseEmission * storeFactor;
//         totalEmissions += itemEmission;
//         itemBreakdown.push({
//           name: item.name,
//           category: item.category,
//           emission: itemEmission,
//           price: item.price,
//         });
//       });

//       const packagingEmission = totalEmissions * 0.05;
//       totalEmissions += packagingEmission;
//       const transportEmission = totalEmissions * 0.1;
//       totalEmissions += transportEmission;

//       setResults({
//         store: data.store,
//         storeRating,
//         totalEmissions: totalEmissions.toFixed(2),
//         itemBreakdown,
//         packagingEmission: packagingEmission.toFixed(2),
//         transportEmission: transportEmission.toFixed(2),
//         milesEquivalent: (totalEmissions / 0.404).toFixed(1),
//         treesNeeded: (totalEmissions / 21).toFixed(2),
//         total: data.total,
//         grade: getGrade(totalEmissions / data.items.length),
//       });

//       setAnalyzing(false);
//       setManualMode(false);
//     } catch (error) {
//       setAnalyzing(false);
//       Alert.alert("Error", `Failed to calculate: ${error.message}`);
//     }
//   };

//   const getGrade = (avgEmission) => {
//     if (avgEmission < 2) return { letter: "A+", color: "#16a34a" };
//     if (avgEmission < 4) return { letter: "A", color: "#22c55e" };
//     if (avgEmission < 6) return { letter: "B", color: "#eab308" };
//     if (avgEmission < 10) return { letter: "C", color: "#f97316" };
//     return { letter: "D", color: "#dc2626" };
//   };

//   const addManualItem = () => {
//     setManualData({
//       ...manualData,
//       items: [...manualData.items, { name: "", price: "", category: "other" }],
//     });
//   };

//   const removeManualItem = (index) => {
//     if (manualData.items.length > 1) {
//       const newItems = manualData.items.filter((_, i) => i !== index);
//       setManualData({ ...manualData, items: newItems });
//     }
//   };

//   const updateManualItem = (index, field, value) => {
//     const newItems = [...manualData.items];
//     newItems[index][field] = value;
//     setManualData({ ...manualData, items: newItems });
//   };

//   const reset = () => {
//     setReceipt(null);
//     setResults(null);
//     setError(null);
//     setManualMode(false);
//     setManualData({
//       store: "",
//       items: [{ name: "", price: "", category: "other" }],
//     });
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={styles.flex}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.title}>🌿 Carbon Receipt Scanner</Text>
//             <Text style={styles.subtitle}>
//               Track your shopping's environmental impact
//             </Text>
//           </View>

//           {/* Upload Section */}
//           {!receipt && !results && !manualMode && (
//             <View style={styles.uploadSection}>
//               <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
//                 <Text style={styles.uploadIcon}>📤</Text>
//                 <Text style={styles.uploadText}>Upload Receipt</Text>
//               </TouchableOpacity>

//               <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
//                 <Text style={styles.uploadIcon}>📷</Text>
//                 <Text style={styles.uploadText}>Take Photo</Text>
//               </TouchableOpacity>

//               <View style={styles.buttonRow}>
//                 <TouchableOpacity style={styles.demoButton} onPress={showDemo}>
//                   <Text style={styles.buttonText}>👁️ Try Demo</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={styles.manualButton}
//                   onPress={() => setManualMode(true)}
//                 >
//                   <Text style={styles.buttonText}>✏️ Manual Entry</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {/* Error Message */}
//           {error && (
//             <View style={styles.errorBox}>
//               <Text style={styles.errorText}>⚠️ {error}</Text>
//             </View>
//           )}

//           {/* Loading */}
//           {analyzing && (
//             <View style={styles.loadingContainer}>
//               <ActivityIndicator size="large" color="#16a34a" />
//               <Text style={styles.loadingText}>Analyzing receipt...</Text>
//             </View>
//           )}

//           {/* Manual Entry */}
//           {manualMode && !results && (
//             <View style={styles.manualSection}>
//               <Text style={styles.sectionTitle}>Manual Entry</Text>

//               <TextInput
//                 style={styles.input}
//                 placeholder="Store Name (e.g., Whole Foods)"
//                 value={manualData.store}
//                 onChangeText={(text) =>
//                   setManualData({ ...manualData, store: text })
//                 }
//               />

//               <Text style={styles.label}>Items:</Text>
//               <ScrollView style={styles.itemsScroll}>
//                 {manualData.items.map((item, index) => (
//                   <View key={index} style={styles.itemRow}>
//                     <TextInput
//                       style={[styles.input, styles.itemName]}
//                       placeholder="Item name"
//                       value={item.name}
//                       onChangeText={(text) =>
//                         updateManualItem(index, "name", text)
//                       }
//                     />
//                     <TextInput
//                       style={[styles.input, styles.itemPrice]}
//                       placeholder="Price"
//                       keyboardType="decimal-pad"
//                       value={item.price}
//                       onChangeText={(text) =>
//                         updateManualItem(index, "price", text)
//                       }
//                     />
//                     {manualData.items.length > 1 && (
//                       <TouchableOpacity
//                         style={styles.removeButton}
//                         onPress={() => removeManualItem(index)}
//                       >
//                         <Text style={styles.removeButtonText}>✕</Text>
//                       </TouchableOpacity>
//                     )}
//                   </View>
//                 ))}
//               </ScrollView>

//               <TouchableOpacity
//                 style={styles.addButton}
//                 onPress={addManualItem}
//               >
//                 <Text style={styles.addButtonText}>+ Add Item</Text>
//               </TouchableOpacity>

//               <View style={styles.buttonRow}>
//                 <TouchableOpacity
//                   style={styles.submitButton}
//                   onPress={handleManualSubmit}
//                 >
//                   <Text style={styles.submitButtonText}>Calculate</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={styles.cancelButton}
//                   onPress={() => setManualMode(false)}
//                 >
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           {/* Results */}
//           {results && (
//             <View style={styles.resultsSection}>
//               {/* Score Cards */}
//               <View style={styles.scoreRow}>
//                 <View
//                   style={[
//                     styles.scoreCard,
//                     { backgroundColor: results.grade.color + "20" },
//                   ]}
//                 >
//                   <Text
//                     style={[styles.scoreValue, { color: results.grade.color }]}
//                   >
//                     {results.grade.letter}
//                   </Text>
//                   <Text style={styles.scoreLabel}>Grade</Text>
//                 </View>

//                 <View style={styles.scoreCard}>
//                   <Text style={styles.scoreValue}>
//                     {results.totalEmissions}
//                   </Text>
//                   <Text style={styles.scoreLabel}>kg CO₂e</Text>
//                 </View>

//                 <View style={styles.scoreCard}>
//                   <Text style={styles.scoreValue}>
//                     ⭐ {results.storeRating}/5
//                   </Text>
//                   <Text style={styles.scoreLabel}>{results.store}</Text>
//                 </View>
//               </View>

//               {/* Equivalents */}
//               <View style={styles.equivalentsBox}>
//                 <Text style={styles.sectionTitle}>What This Means</Text>
//                 <Text style={styles.equivalentText}>
//                   🚗 Equivalent to driving {results.milesEquivalent} miles
//                 </Text>
//                 <Text style={styles.equivalentText}>
//                   🌳 {results.treesNeeded} trees needed for 1 year to offset
//                 </Text>
//               </View>

//               {/* Items Breakdown */}
//               <View style={styles.breakdownBox}>
//                 <Text style={styles.sectionTitle}>Emission Breakdown</Text>
//                 {results.itemBreakdown
//                   .sort((a, b) => b.emission - a.emission)
//                   .map((item, idx) => (
//                     <View key={idx} style={styles.itemCard}>
//                       <View style={styles.itemInfo}>
//                         <Text style={styles.itemName}>{item.name}</Text>
//                         <Text style={styles.itemCategory}>{item.category}</Text>
//                       </View>
//                       <View style={styles.itemStats}>
//                         <Text style={styles.itemEmission}>
//                           {item.emission.toFixed(2)} kg CO₂e
//                         </Text>
//                         <Text style={styles.itemPriceText}>
//                           ${item.price.toFixed(2)}
//                         </Text>
//                       </View>
//                     </View>
//                   ))}
//                 <View style={styles.additionalItem}>
//                   <Text style={styles.additionalLabel}>Packaging</Text>
//                   <Text style={styles.additionalValue}>
//                     {results.packagingEmission} kg
//                   </Text>
//                 </View>
//                 <View style={styles.additionalItem}>
//                   <Text style={styles.additionalLabel}>Transportation</Text>
//                   <Text style={styles.additionalValue}>
//                     {results.transportEmission} kg
//                   </Text>
//                 </View>
//               </View>

//               {/* Tips */}
//               <View style={styles.tipsBox}>
//                 <Text style={styles.tipsTitle}>💡 Reduce Your Footprint</Text>
//                 <Text style={styles.tipText}>
//                   • Choose plant-based products
//                 </Text>
//                 <Text style={styles.tipText}>• Buy organic and local</Text>
//                 <Text style={styles.tipText}>• Shop at sustainable stores</Text>
//                 <Text style={styles.tipText}>• Reduce meat consumption</Text>
//               </View>

//               <TouchableOpacity style={styles.resetButton} onPress={reset}>
//                 <Text style={styles.resetButtonText}>Scan Another Receipt</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f0fdf4",
//   },
//   flex: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 20,
//   },
//   header: {
//     marginBottom: 30,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "bold",
//     color: "#166534",
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: "#6b7280",
//   },
//   uploadSection: {
//     gap: 15,
//   },
//   uploadButton: {
//     backgroundColor: "#fff",
//     padding: 40,
//     borderRadius: 15,
//     borderWidth: 3,
//     borderColor: "#d1d5db",
//     borderStyle: "dashed",
//     alignItems: "center",
//   },
//   cameraButton: {
//     backgroundColor: "#fff",
//     padding: 30,
//     borderRadius: 15,
//     borderWidth: 2,
//     borderColor: "#16a34a",
//     alignItems: "center",
//   },
//   uploadIcon: {
//     fontSize: 48,
//     marginBottom: 10,
//   },
//   uploadText: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#374151",
//   },
//   buttonRow: {
//     flexDirection: "row",
//     gap: 10,
//   },
//   demoButton: {
//     flex: 1,
//     backgroundColor: "#3b82f6",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   manualButton: {
//     flex: 1,
//     backgroundColor: "#9333ea",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   buttonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   errorBox: {
//     backgroundColor: "#fee2e2",
//     padding: 15,
//     borderRadius: 12,
//     marginBottom: 20,
//   },
//   errorText: {
//     color: "#dc2626",
//     fontSize: 14,
//   },
//   loadingContainer: {
//     padding: 60,
//     alignItems: "center",
//   },
//   loadingText: {
//     marginTop: 20,
//     fontSize: 18,
//     color: "#374151",
//     fontWeight: "600",
//   },
//   manualSection: {
//     gap: 15,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#111827",
//     marginBottom: 10,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#374151",
//     marginTop: 10,
//   },
//   input: {
//     backgroundColor: "#fff",
//     padding: 15,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: "#d1d5db",
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   itemsScroll: {
//     maxHeight: 300,
//   },
//   itemRow: {
//     flexDirection: "row",
//     gap: 10,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   itemName: {
//     flex: 2,
//     marginBottom: 0,
//   },
//   itemPrice: {
//     flex: 1,
//     marginBottom: 0,
//   },
//   removeButton: {
//     backgroundColor: "#fee2e2",
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   removeButtonText: {
//     color: "#dc2626",
//     fontSize: 20,
//     fontWeight: "bold",
//   },
//   addButton: {
//     padding: 12,
//     alignItems: "center",
//   },
//   addButtonText: {
//     color: "#16a34a",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   submitButton: {
//     flex: 1,
//     backgroundColor: "#16a34a",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   submitButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   cancelButton: {
//     flex: 0.4,
//     backgroundColor: "#e5e7eb",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   cancelButtonText: {
//     color: "#374151",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   resultsSection: {
//     gap: 20,
//   },
//   scoreRow: {
//     flexDirection: "row",
//     gap: 10,
//   },
//   scoreCard: {
//     flex: 1,
//     backgroundColor: "#fff",
//     padding: 20,
//     borderRadius: 15,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   scoreValue: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: "#111827",
//     marginBottom: 5,
//   },
//   scoreLabel: {
//     fontSize: 12,
//     color: "#6b7280",
//     fontWeight: "600",
//   },
//   equivalentsBox: {
//     backgroundColor: "#f3f4f6",
//     padding: 20,
//     borderRadius: 15,
//   },
//   equivalentText: {
//     fontSize: 14,
//     color: "#374151",
//     marginTop: 8,
//   },
//   breakdownBox: {
//     backgroundColor: "#fff",
//     padding: 20,
//     borderRadius: 15,
//   },
//   itemCard: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     backgroundColor: "#f9fafb",
//     padding: 15,
//     borderRadius: 10,
//     marginTop: 10,
//   },
//   itemInfo: {
//     flex: 1,
//   },
//   itemName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#111827",
//   },
//   itemCategory: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginTop: 4,
//     textTransform: "capitalize",
//   },
//   itemStats: {
//     alignItems: "flex-end",
//   },
//   itemEmission: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#111827",
//   },
//   itemPriceText: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginTop: 4,
//   },
//   additionalItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     backgroundColor: "#dbeafe",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   additionalLabel: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#1e3a8a",
//   },
//   additionalValue: {
//     fontSize: 14,
//     fontWeight: "bold",
//     color: "#1e3a8a",
//   },
//   tipsBox: {
//     backgroundColor: "#16a34a",
//     padding: 20,
//     borderRadius: 15,
//   },
//   tipsTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 10,
//   },
//   tipText: {
//     fontSize: 14,
//     color: "#fff",
//     marginTop: 6,
//   },
//   resetButton: {
//     backgroundColor: "#16a34a",
//     padding: 18,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   resetButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });

// export default CarbonReceiptScanner;
import React, { useEffect } from "react";
import { Button, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import axios from "axios";
WebBrowser.maybeCompleteAuthSession();
export default function GoogleLogin() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "93116964233-i8dt8gathqh7ddbnhqq8u9jr6i827urm.apps.googleusercontent.com",
    webClientId:
      "93116964233-28rchgmcqpd68gda808i4dl31hc66737.apps.googleusercontent.com",
  });
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("Google ID Token:", id_token);
      axios
        .post("http://YOUR_SERVER_IP:8000/auth/google", { token: id_token })
        .then((res) => {
          console.log("Our API Token:", res.data.token);
        })
        .catch((err) => console.log(err));
    }
  }, [response]);
  return (
    <View style={{ marginTop: 100 }}>
      <Button
        disabled={!request}
        title="Sign in with Google"
        onPress={() => promptAsync()}
      />
    </View>
  );
}
