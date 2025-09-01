import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { formatDistanceToNow } from 'date-fns';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StoryGroup {
  user: {
    _id: string;
    username: string;
    image: string;
  };
  stories: Array<{
    _id: Id<'stories'>;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
    viewers: number;
    _creationTime: number;
    expiresAt: number;
  }>;
  hasUnseen: boolean;
  isOwn: boolean;
}

interface StoryViewerProps {
  visible: boolean;
  onClose: () => void;
  storyGroups: StoryGroup[];
  initialGroupIndex?: number;
  initialStoryIndex?: number;
}

const STORY_DURATION = 5000; // 5 seconds for images
const PROGRESS_BAR_HEIGHT = 3;

export default function StoryViewer({
  visible,
  onClose,
  storyGroups,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showViewers, setShowViewers] = useState(false);

  const progressValue = useSharedValue(0);
  const translateY = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  
  // Video player for video stories
  const player = useVideoPlayer(currentStory?.mediaType === 'video' ? currentStory.mediaUrl : '', (player) => {
    player.loop = false;
    player.play();
  });

  const markAsViewed = useMutation(api.stories.markStoryAsViewed);
  const deleteStory = useMutation(api.stories.deleteStory);
  const storyViewers = useQuery(
    api.stories.getStoryViewers,
    currentStory && currentGroup?.isOwn ? { storyId: currentStory._id } : 'skip'
  );

  // Auto-progress timer
  useEffect(() => {
    if (!visible || isPaused || !currentStory) return;

    progressValue.value = 0;
    
    const startTime = Date.now();
    const duration = currentStory.mediaType === 'video' ? 10000 : STORY_DURATION;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      progressValue.value = progress;
      
      if (progress >= 1) {
        goToNext();
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, isPaused, currentStory, currentGroupIndex, currentStoryIndex]);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentGroup?.isOwn) {
      markAsViewed({ storyId: currentStory._id });
    }
  }, [currentStory, currentGroup?.isOwn]);

  const goToNext = () => {
    const nextStoryIndex = currentStoryIndex + 1;
    const nextGroupIndex = currentGroupIndex + 1;

    if (nextStoryIndex < currentGroup.stories.length) {
      setCurrentStoryIndex(nextStoryIndex);
    } else if (nextGroupIndex < storyGroups.length) {
      setCurrentGroupIndex(nextGroupIndex);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    const prevStoryIndex = currentStoryIndex - 1;
    const prevGroupIndex = currentGroupIndex - 1;

    if (prevStoryIndex >= 0) {
      setCurrentStoryIndex(prevStoryIndex);
    } else if (prevGroupIndex >= 0) {
      setCurrentGroupIndex(prevGroupIndex);
      setCurrentStoryIndex(storyGroups[prevGroupIndex].stories.length - 1);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !currentGroup?.isOwn) return;

    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory({ storyId: currentStory._id });
              goToNext();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete story');
            }
          },
        },
      ]
    );
  };

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      if (event.translationY > 100) {
        // Swipe down to close
        runOnJS(onClose)();
      } else {
        // Snap back
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  if (!visible || !currentStory || !currentGroup) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarHidden>
      <PanGestureHandler onGestureEvent={panGestureHandler}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Background Media */}
          {currentStory.mediaType === 'image' ? (
            <Image
              source={{ uri: currentStory.mediaUrl }}
              style={styles.backgroundMedia}
              contentFit="cover"
              onLoadStart={() => setIsLoading(true)}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <VideoView
              player={player}
              style={styles.backgroundMedia}
              contentFit="cover"
              onLoadStart={() => setIsLoading(true)}
              onLoad={() => setIsLoading(false)}
            />
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}

          {/* Progress bars */}
          <View style={styles.progressContainer}>
            {currentGroup.stories.map((_, index) => (
              <View key={index} style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: index === currentStoryIndex ? progressBarStyle.width :
                             index < currentStoryIndex ? '100%' : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Top overlay */}
          <View style={styles.topOverlay}>
            <View style={styles.userInfo}>
              <Image
                source={{ uri: currentGroup.user.image }}
                style={styles.userAvatar}
                contentFit="cover"
              />
              <View style={styles.userDetails}>
                <Text style={styles.username}>{currentGroup.user.username}</Text>
                <Text style={styles.timestamp}>
                  {formatDistanceToNow(currentStory._creationTime, { addSuffix: true })}
                </Text>
              </View>
            </View>

            <View style={styles.topActions}>
              {currentGroup.isOwn && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowViewers(true)}
                >
                  <Ionicons name="eye" size={20} color="white" />
                  <Text style={styles.viewersCount}>{currentStory.viewers}</Text>
                </TouchableOpacity>
              )}

              {currentGroup.isOwn && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDeleteStory}
                >
                  <Ionicons name="trash" size={20} color="white" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Caption */}
          {currentStory.caption && (
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>{currentStory.caption}</Text>
            </View>
          )}

          {/* Touch areas for navigation */}
          <TouchableOpacity
            style={styles.leftTouchArea}
            onPress={goToPrevious}
            onPressIn={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
          />
          <TouchableOpacity
            style={styles.rightTouchArea}
            onPress={goToNext}
            onPressIn={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
          />

          {/* Story viewers modal */}
          <Modal visible={showViewers} animationType="slide" transparent>
            <View style={styles.viewersModal}>
              <View style={styles.viewersContent}>
                <View style={styles.viewersHeader}>
                  <Text style={styles.viewersTitle}>Viewers</Text>
                  <TouchableOpacity onPress={() => setShowViewers(false)}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {storyViewers?.map((viewer) => (
                  <View key={viewer._id} style={styles.viewerItem}>
                    <Image
                      source={{ uri: viewer.user.image }}
                      style={styles.viewerAvatar}
                      contentFit="cover"
                    />
                    <View style={styles.viewerInfo}>
                      <Text style={styles.viewerUsername}>
                        {viewer.user.username}
                      </Text>
                      <Text style={styles.viewerTime}>
                        {formatDistanceToNow(viewer.viewedAt, { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                ))}

                {(!storyViewers || storyViewers.length === 0) && (
                  <View style={styles.emptyViewers}>
                    <Text style={styles.emptyViewersText}>No viewers yet</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  backgroundMedia: {
    position: 'absolute',
    width: screenWidth,
    height: screenHeight,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 70,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewersCount: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  leftTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.3,
  },
  rightTouchArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: screenWidth * 0.7,
  },
  viewersModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewersContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.6,
    paddingBottom: 40,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey + '20',
  },
  viewersTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  viewerInfo: {
    flex: 1,
  },
  viewerUsername: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  viewerTime: {
    color: COLORS.grey,
    fontSize: 12,
    marginTop: 2,
  },
  emptyViewers: {
    padding: 40,
    alignItems: 'center',
  },
  emptyViewersText: {
    color: COLORS.grey,
    fontSize: 16,
  },
});
