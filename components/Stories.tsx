import { styles } from "@/styles/feed.styles";
import { ScrollView, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Story from "./Story";
import { useUser } from "@clerk/clerk-expo";

const StoriesSection = () => {
  const { user } = useUser();
  const storiesData = useQuery(api.stories.getAllStories);
  const currentUserData = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id || "",
  });

  if (!storiesData || !currentUserData) return null;

  const isCurrentUserInList = storiesData.some(
    (s) => s.user._id === currentUserData._id
  );

  const storiesToShow = isCurrentUserInList
    ? storiesData
    : [{ user: currentUserData, stories: [] }, ...storiesData];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
      >
        {storiesToShow.map((userStories) => (
          <Story
            key={userStories.user._id}
            user={userStories.user}
            stories={userStories.stories}
            isCurrentUser={userStories.user._id === currentUserData._id}
            currentUser={currentUserData}
          />
        ))}
      </ScrollView>

      {/* Divider niche hamesha dikhega */}
      <View style={styles.storiesDivider} />
    </View>
  );
};

export default StoriesSection;
