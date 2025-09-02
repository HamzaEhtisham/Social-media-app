import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { COLORS } from "@/constants/theme";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const { width, height } = Dimensions.get("window");

type Story = {
  _id: string;
  imageUrl: string;
  caption?: string;
  likes: number;
  views: number;
  createdAt: number;
  expiresAt: number;
  mediaType: string;
  isLiked?: boolean;
};

type User = {
  _id: string;
  username: string;
  image: string;
};

type StoryViewerProps = {
  visible: boolean;
  onClose: () => void;
  user: User;
  stories: Story[];
  initialIndex?: number;
  currentUser: User;
};

export default function StoryViewer({
  visible,
  onClose,
  user,
  stories,
  initialIndex = 0,
  currentUser,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const viewStory = useMutation(api.stories.viewStory);
  const toggleLikeMutation = useMutation(api.stories.toggleLike);
  const deleteStory = useMutation(api.stories.deleteStory);

  const currentStory = stories[currentIndex];
  const [isLiked, setIsLiked] = useState(currentStory?.isLiked || false);

  console.log(
    "StoryViewer: visible=",
    visible,
    "currentIndex=",
    currentIndex,
    "stories.length=",
    stories.length,
    "currentStory=",
    currentStory
  );

  useEffect(() => {
    if (visible && currentStory) {
      console.log(
        "Viewing story:",
        currentStory._id,
        "mediaType:",
        currentStory.mediaType,
        "imageUrl:",
        currentStory.imageUrl
      );
      // Update isLiked when story changes
      setIsLiked(currentStory.isLiked || false);

      // Mark story as viewed
      viewStory({ storyId: currentStory._id as any });

      // Auto-advance story after 5 seconds
      const timer = setTimeout(() => {
        console.log("Timer fired, advancing story");
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setProgress(0);
        } else {
          console.log("Last story, closing");
          onClose();
        }
      }, 5000);

      // Progress animation
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(progressTimer);
      };
    }
  }, [visible, currentIndex, currentStory, stories.length, onClose, viewStory]);

  const handleLike = async () => {
    if (currentStory) {
      const newIsLiked = await toggleLikeMutation({
        storyId: currentStory._id as any,
      });
      setIsLiked(newIsLiked);
    }
  };

  const handleDelete = async () => {
    console.log("handleDelete called for story:", currentStory?._id);
    console.log("currentUser:", currentUser);
    if (currentStory) {
      try {
        await deleteStory({ storyId: currentStory._id as any });
        console.log("Delete successful");
        onClose(); // Close the viewer after deleting
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  if (!currentStory) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {/* Progress Bar */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 10,
            paddingTop: 50,
            gap: 2,
          }}
        >
          {stories.map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 2,
                backgroundColor: "rgba(255,255,255,0.3)",
                borderRadius: 1,
              }}
            >
              <View
                style={{
                  height: "100%",
                  backgroundColor: "white",
                  width:
                    index === currentIndex
                      ? `${progress}%`
                      : index < currentIndex
                        ? "100%"
                        : "0%",
                  borderRadius: 1,
                }}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Image
            source={{ uri: user.image }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              marginRight: 12,
            }}
          />
          <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
            {user.username}
          </Text>
          <View style={{ flex: 1 }} />
          {currentUser._id === user._id && (
            <>
              {console.log(
                "Delete button rendered for story:",
                currentStory?._id
              )}
              <TouchableOpacity
                onPress={handleDelete}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="trash-outline" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Story Media */}
        <View
          style={{ flex: 1, justifyContent: "center", position: "relative" }}
        >
          {currentStory.mediaType === "video" ? (
            <Video
              source={{ uri: currentStory.imageUrl }}
              style={{ width, height: height * 0.7 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              useNativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: currentStory.imageUrl }}
              style={{ width, height: height * 0.7 }}
              resizeMode="contain"
            />
          )}

          {/* Tap areas for navigation */}
          <TouchableOpacity
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: width / 2,
              height: "100%",
            }}
            onPress={goToPrevious}
          />
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: width / 2,
              height: "100%",
            }}
            onPress={goToNext}
          />
        </View>

        {/* Caption */}
        {currentStory.caption && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 20,
            }}
          >
            <Text style={{ color: "white", fontSize: 16 }}>
              {currentStory.caption}
            </Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 40,
          }}
        >
          <TouchableOpacity
            onPress={goToPrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={30}
              color={currentIndex === 0 ? "rgba(255,255,255,0.3)" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLike}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={30}
              color={isLiked ? "red" : "white"}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNext}>
            <Ionicons
              name="chevron-forward"
              size={30}
              color={
                currentIndex === stories.length - 1
                  ? "rgba(255,255,255,0.3)"
                  : "white"
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
