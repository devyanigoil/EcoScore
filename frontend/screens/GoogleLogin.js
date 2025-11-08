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
