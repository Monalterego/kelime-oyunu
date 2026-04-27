import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Category: undefined;
  Game: { mode: "classic" | "daily" | "category"; category?: string };
  HowToPlay: undefined;
  Achievements: undefined;
  Profile: undefined;
  Leaderboard: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
