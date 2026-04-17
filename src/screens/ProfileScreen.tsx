import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { C, T, S, R } from "../theme/tokens";
import { getLocalProfile, createProfile } from "../utils/supabase";
import { Btn } from "../components/ui";

export default function ProfileScreen({ navigation }: any) {
  const [nickname, setNickname] = useState("");
  const [profile, setProfile] = useState<{ id: string; nickname: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocalProfile().then(p => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (nickname.trim().length < 3) {
      setError("En az 3 karakter olmalı");
      return;
    }
    if (nickname.trim().length > 15) {
      setError("En fazla 15 karakter olabilir");
      return;
    }
    setError("");
    const result = await createProfile(nickname.trim());
    if (result) {
      setProfile(result);
    } else {
      setError("Bu isim alınmış, başka bir isim dene");
    }
  };

  if (loading) return null;

  if (profile) {
    return (
      <View style={s.container}>
        <View style={s.content}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile.nickname.charAt(0).toLocaleUpperCase("tr-TR")}</Text>
          </View>
          <Text style={[T.h1, { color: C.text, marginTop: S.xl }]}>{profile.nickname}</Text>
          <Text style={[T.bodySm, { color: C.textFaint, marginTop: S.sm }]}>Profil aktif</Text>
        </View>
        <View style={s.actions}>
          <Btn label="Liderlik Tablosu" onPress={() => navigation.navigate("Leaderboard")} variant="cta" />
          <Btn label="Geri Dön" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.content}>
        <Text style={[T.h1, { color: C.text }]}>Profil Oluştur</Text>
        <Text style={[T.bodySm, { color: C.textSoft, marginTop: S.sm, textAlign: "center" }]}>
          Liderlik tablosunda yer almak için bir kullanıcı adı seç
        </Text>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Kullanıcı adı..."
          placeholderTextColor={C.textFaint}
          autoCapitalize="none"
          maxLength={15}
        />
        {error ? <Text style={[T.bodySm, { color: C.red, marginTop: S.sm }]}>{error}</Text> : null}
      </View>
      <View style={s.actions}>
        <Btn label="Kaydet" onPress={handleCreate} variant="cta" />
        <Btn label="Şimdilik Geç" onPress={() => navigation.goBack()} variant="ghost" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.page, paddingTop: 80, paddingBottom: 40 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orange, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 36, fontWeight: "900", color: C.white },
  input: { width: "100%", backgroundColor: C.surface, borderWidth: 2, borderColor: C.surfaceLight, borderRadius: R.lg, padding: S.lg, marginTop: S.xl, fontSize: 18, fontWeight: "600", color: C.text, textAlign: "center" },
  actions: { gap: S.md },
});
