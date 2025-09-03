import { Loader } from "@/components/Loader";
import Post from "@/components/Post";
import StoriesSection from "@/components/Stories";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../styles/feed.styles";
import { useState } from "react";

export default function Index() {
  const [refreshing, setRefreshing] = useState(false);

  const posts = useQuery(api.posts.getFeedPosts);

  if (posts === undefined) return <Loader />;
  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>lamelight</Text>
          <TouchableOpacity onPress={() => router.push("/(chat)/chat")}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <StoriesSection />
        <NoPostsFound />
      </View>
    );
  }

  // this does nothing
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>lamelight</Text>
        <TouchableOpacity onPress={() => router.push("/(chat)/chat")}>
          <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => <Post post={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={<StoriesSection />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
}

const NoPostsFound = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: COLORS.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    }}
  >
    <Ionicons name="images-outline" size={64} color={COLORS.primary} />
    <Text
      style={{
        fontSize: 24,
        color: COLORS.primary,
        marginTop: 16,
        fontFamily: "JetBrainsMono-Medium",
        textAlign: "center",
      }}
    >
      No posts yet
    </Text>
    <Text
      style={{
        fontSize: 16,
        color: COLORS.grey,
        marginTop: 8,
        textAlign: "center",
        opacity: 0.7,
      }}
    >
      Be the first one to share a moment!
    </Text>
  </View>
);
