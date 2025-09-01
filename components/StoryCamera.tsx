import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS } from '@/constants/theme';
import { Image } from 'expo-image';
import { router } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StoryCameraProps {
  visible: boolean;
  onClose: () => void;
  onStoryUploaded?: () => void;
}

type MediaType = 'image' | 'video';

export default function StoryCamera({ visible, onClose, onStoryUploaded }: StoryCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<{
    uri: string;
    type: MediaType;
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const cameraRef = useRef<CameraView>(null);

  const generateUploadUrl = useMutation(api.stories.generateStoryUploadUrl);
  const createStory = useMutation(api.stories.createStory);

  // Take photo
  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        setCapturedMedia({ uri: photo.uri, type: 'image' });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Photo capture error:', error);
    }
  };

  // Start/stop video recording
  const toggleVideoRecording = async () => {
    if (!cameraRef.current) return;

    try {
      if (isRecording) {
        // Stop recording
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } else {
        // Start recording
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30, // 30 seconds max
        });

        if (video) {
          setCapturedMedia({ uri: video.uri, type: 'video' });
        }
        setIsRecording(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video');
      console.error('Video recording error:', error);
      setIsRecording(false);
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media from gallery');
      console.error('Gallery picker error:', error);
    }
  };

  // Upload story with progress
  const uploadStory = async () => {
    if (!capturedMedia) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Convert file to blob
      const response = await fetch(capturedMedia.uri);
      const blob = await response.blob();

      // Upload file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await uploadResponse.json();

      // Create story record
      await createStory({
        storageId,
        mediaType: capturedMedia.type,
        caption: caption.trim() || undefined,
      });

      setUploadProgress(100);
      
      // Success feedback
      Alert.alert('Success!', 'Your story has been uploaded!', [
        {
          text: 'OK',
          onPress: () => {
            onStoryUploaded?.();
            resetCamera();
            onClose();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload story');
      console.error('Story upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset camera state
  const resetCamera = () => {
    setCapturedMedia(null);
    setCaption('');
    setIsRecording(false);
  };

  // Toggle camera type
  const toggleCameraType = () => {
    setFacing(current => 
      current === 'back' ? 'front' : 'back'
    );
  };

  // Toggle flash
  const toggleFlash = () => {
    setFlash(current => 
      current === 'off' ? 'on' : 'off'
    );
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.permissionText}>Requesting permissions...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.grey} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
            <Text style={styles.retryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {!capturedMedia ? (
          // Camera View
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flash}
            />

            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.controlButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                <Ionicons 
                  name={flash === 'off' ? 'flash-off' : 'flash'} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                <Ionicons name="images" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.captureContainer}>
                {/* Photo capture */}
                <TouchableOpacity 
                  style={[styles.captureButton, isRecording && styles.captureButtonDisabled]} 
                  onPress={takePhoto}
                  disabled={isRecording}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                {/* Video record button */}
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                  ]}
                  onPress={toggleVideoRecording}
                >
                  <View style={[
                    styles.recordButtonInner,
                    isRecording && styles.recordButtonInnerActive,
                  ]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
                <Ionicons name="camera-reverse" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}
          </View>
        ) : (
          // Preview & Upload View
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: capturedMedia.uri }}
              style={styles.previewMedia}
              contentFit="cover"
            />

            {/* Top overlay */}
            <View style={styles.previewTopOverlay}>
              <TouchableOpacity onPress={resetCamera}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Your Story</Text>
            </View>

            {/* Bottom overlay */}
            <View style={styles.previewBottomOverlay}>
              <View style={styles.captionContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption..."
                  placeholderTextColor={COLORS.grey}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                />
              </View>

              <View style={styles.uploadContainer}>
                {isUploading ? (
                  <View style={styles.uploadProgress}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.uploadProgressText}>
                      Uploading... {uploadProgress}%
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={uploadStory}>
                    <Text style={styles.uploadButtonText}>Share Story</Text>
                    <Ionicons name="send" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: COLORS.primary,
  },
  recordButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red',
  },
  recordButtonInnerActive: {
    borderRadius: 2,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
  },
  previewMedia: {
    flex: 1,
    width: '100%',
  },
  previewTopOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  previewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
  },
  previewBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    paddingBottom: 40,
  },
  captionContainer: {
    marginBottom: 20,
  },
  captionInput: {
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  uploadContainer: {
    alignItems: 'center',
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
