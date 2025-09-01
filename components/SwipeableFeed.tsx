import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Post from './Post';
import { COLORS } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

interface SwipeableFeedProps {
  posts: any[];
  initialIndex?: number;
  onPostChange?: (index: number) => void;
}

export default function SwipeableFeed({ 
  posts, 
  initialIndex = 0, 
  onPostChange 
}: SwipeableFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const translateY = useSharedValue(0);
  const panRef = useRef<PanGestureHandler>(null);

  const goToNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onPostChange?.(newIndex);
      translateY.value = withSpring(0);
    } else {
      // Haptic feedback when reaching end
      Alert.alert('End of feed', 'You\'ve seen all posts!');
      translateY.value = withSpring(0);
    }
  }, [currentIndex, posts.length, onPostChange]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onPostChange?.(newIndex);
      translateY.value = withSpring(0);
    } else {
      // Bounce back to top
      translateY.value = withSpring(0);
    }
  }, [currentIndex, onPostChange]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startY: number }
  >({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      const shouldGoNext = event.translationY < -SWIPE_THRESHOLD && event.velocityY < -500;
      const shouldGoPrevious = event.translationY > SWIPE_THRESHOLD && event.velocityY > 500;

      if (shouldGoNext) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
        runOnJS(goToNext)();
      } else if (shouldGoPrevious) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
        runOnJS(goToPrevious)();
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_HEIGHT * 0.3],
      [1, 0.7],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_HEIGHT * 0.3],
      [1, 0.9],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale },
      ],
      opacity,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_HEIGHT * 0.3],
      [0, 0.3],
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  // Swipe direction indicators
  const nextIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD * 2, -SWIPE_THRESHOLD, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    );

    const translateYIndicator = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD * 2, 0],
      [-20, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY: translateYIndicator }],
    };
  });

  const prevIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 2],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    );

    const translateYIndicator = interpolate(
      translateY.value,
      [0, SWIPE_THRESHOLD * 2],
      [0, 20],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY: translateYIndicator }],
    };
  });

  if (!posts || posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No posts to show</Text>
      </View>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <View style={styles.container}>
      <PanGestureHandler ref={panRef} onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.postContainer, animatedStyle]}>
          {/* Overlay */}
          <Animated.View style={[styles.overlay, overlayStyle]} />
          
          {/* Current Post */}
          <Post post={currentPost} />

          {/* Swipe Indicators */}
          <Animated.View style={[styles.nextIndicator, nextIndicatorStyle]}>
            <Ionicons name="chevron-up" size={24} color="white" />
            <Text style={styles.indicatorText}>
              {currentIndex < posts.length - 1 ? 'Next Post' : 'End of Feed'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.prevIndicator, prevIndicatorStyle]}>
            <Text style={styles.indicatorText}>
              {currentIndex > 0 ? 'Previous Post' : 'Start of Feed'}
            </Text>
            <Ionicons name="chevron-down" size={24} color="white" />
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      {/* Post Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1} of {posts.length}
        </Text>
      </View>

      {/* Navigation Hints */}
      <View style={styles.hints}>
        <View style={styles.hint}>
          <Ionicons name="finger-print" size={16} color={COLORS.grey} />
          <Text style={styles.hintText}>Swipe up/down to navigate</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  postContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 1,
    pointerEvents: 'none',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    color: COLORS.grey,
    fontSize: 16,
  },
  nextIndicator: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  prevIndicator: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  indicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  counter: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  hints: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    color: COLORS.grey,
    fontSize: 12,
    marginLeft: 6,
  },
});
