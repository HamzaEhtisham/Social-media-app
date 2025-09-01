import { useState } from "react";
import { ScrollView, TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/feed.styles";
import StoryCamera from "./StoryCamera";
import StoryViewer from "./StoryViewer";

const StoriesSection = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  // Fetch real-time stories from Convex
  const storyGroups = useQuery(api.stories.getFeedStories) || [];

  const handleAddStory = () => {
    setShowCamera(true);
  };

  const handleStoryPress = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setShowViewer(true);
  };

  const handleStoryUploaded = () => {
    // Stories will auto-refresh due to real-time updates
    console.log('Story uploaded successfully!');
  };

  // Add Story Ring Component
  const AddStoryRing = () => (
    <TouchableOpacity
      onPress={handleAddStory}
      style={styles.storyContainer}
      activeOpacity={0.7}
    >
      <View style={styles.addStoryRing}>
        <View style={styles.addStoryInner}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </View>
      </View>
      <Text style={styles.storyUsername}>Your Story</Text>
    </TouchableOpacity>
  );

  // Story Ring Component with unseen indicator
  const StoryRing = ({ group, onPress }: { group: any; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={styles.storyContainer}
      activeOpacity={0.7}
    >
      <View style={[
        styles.storyRing,
        group.hasUnseen && styles.storyRingUnseen,
        group.isOwn && styles.storyRingOwn,
      ]}>
        <View style={styles.storyImageContainer}>
          <Image
            source={{ uri: group.user.image }}
            style={styles.storyImage}
            contentFit="cover"
          />
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {group.isOwn ? 'Your Story' : group.user.username}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
        contentContainerStyle={styles.storiesContentContainer}
        decelerationRate="fast"
      >
        {/* Add Story Button */}
        <AddStoryRing />

        {/* Story Rings */}
        {storyGroups.map((group, index) => (
          <StoryRing
            key={group.user._id}
            group={group}
            onPress={() => handleStoryPress(index)}
          />
        ))}
      </ScrollView>

      {/* Story Camera Modal */}
      <StoryCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onStoryUploaded={handleStoryUploaded}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={showViewer}
        onClose={() => setShowViewer(false)}
        storyGroups={storyGroups}
        initialGroupIndex={selectedGroupIndex}
      />
    </>
  );
};

export default StoriesSection;
