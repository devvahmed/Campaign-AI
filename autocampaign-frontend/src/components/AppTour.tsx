import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const TOUR_STEPS = [
  {
    title: "Welcome! 🚀",
    text: "Hi! I am your AI Host. I will give you a quick, simple tour of our app so you don't get bored. Ready? Tap 'Next'!",
    position: { top: height * 0.3, left: 20 },
  },
  {
    title: "1. Dashboard 🏠",
    text: "This is your Home. Here you can see your active campaigns and how your business is doing in one glance.",
    position: { top: height * 0.6, left: 20 },
  },
  {
    title: "2. Analyze Sources 📊",
    text: "Tap the Upload button at the bottom! Our 5 smart AI agents will read PDFs, CSVs, and Web Articles, find contradictions, and plan a strategy.",
    position: { top: height * 0.5, left: 20 },
  },
  {
    title: "3. Creative Ads 🎨",
    text: "Our AI creates cool image ads with Pakistani trends and compares you with competitors. No more boring ads!",
    position: { top: height * 0.4, left: 20 },
  },
  {
    title: "4. Trace Logs 🕵️‍♂️",
    text: "Curious how AI makes decisions? The Trace tab shows every single step and Antigravity log. It's like reading the AI's mind!",
    position: { top: height * 0.6, left: 20 },
  },
  {
    title: "All Set! 🎉",
    text: "You're ready to launch campaigns like a pro. Enjoy the app!",
    position: { top: height * 0.3, left: 20 },
  }
];

export const AppTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const positionAnim = useRef(new Animated.ValueXY({ x: 0, y: height })).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      const step = TOUR_STEPS[currentStep];
      
      Animated.parallel([
        Animated.timing(positionAnim, {
          toValue: { x: step.position.left, y: step.position.top },
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      // Fade out text briefly during move
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.overlay} pointerEvents="auto" />
      
      <Animated.View style={[
        styles.tourBox,
        { top: positionAnim.y, left: positionAnim.x }
      ]}>
        
        {/* The Host Character */}
        <View style={styles.hostContainer}>
          <Text style={styles.hostEmoji}>🤖</Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>{TOUR_STEPS[currentStep].title}</Text>
          <Text style={styles.text}>{TOUR_STEPS[currentStep].text}</Text>
          
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next 🚀"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tourBox: {
    position: 'absolute',
    width: width - 40,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hostContainer: {
    position: 'absolute',
    top: -30,
    left: -15,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  hostEmoji: {
    fontSize: 30,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
