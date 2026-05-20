import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';
import { useCampaignStore } from '../store/campaignStore';
import { useTheme } from '../theme/useTheme';

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
    title: "Personalize Experience 🚀",
    text: "Before we finish, let's set up your profile.",
    question: "Aap kitnay saal se business kar rahe hain?",
    options: ["<1 year", "1-3 years", ">3 years"],
    position: { top: height * 0.3, left: 20 },
  },
  {
    title: "Language Style 🧠",
    text: "How should I explain things to you?",
    question: "Business knowledge level kya hai?",
    options: ["Beginner (Bilkul aam zaban)", "Advanced (Professional terms)"],
    position: { top: height * 0.3, left: 20 },
  }
];

export const AppTour = () => {
  const T = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const positionAnim = useRef(new Animated.ValueXY({ x: 0, y: height })).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const setBusinessLevel = useCampaignStore(state => state.setBusinessLevel);

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

  const handleOptionSelect = (option: string) => {
    if (currentStep === TOUR_STEPS.length - 1) {
      if (option.includes("Beginner")) {
        setBusinessLevel("beginner");
      } else {
        setBusinessLevel("advanced");
      }
      setIsVisible(false);
    } else {
      handleNext();
    }
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.overlay, { backgroundColor: T.isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(26,28,36,0.3)' }]} pointerEvents="auto" />
      
      <Animated.View style={[
        styles.tourBox,
        T.cardLg,
        T.shadow,
        {
          top: positionAnim.y,
          left: positionAnim.x,
          borderColor: T.isDarkMode ? T.borderMid : T.border,
        }
      ]}>
        
        {/* The Host Character */}
        <View style={[styles.hostContainer, { backgroundColor: T.primary, borderColor: T.surface }]}>
          <Text style={styles.hostEmoji}>🤖</Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={[styles.title, { color: T.text }]}>{step.title}</Text>
          <Text style={[styles.text, { color: T.textSub }]}>{step.text}</Text>
          
          {step.question ? <Text style={[styles.questionText, { color: T.text }]}>{step.question}</Text> : null}
          
          {step.options ? (
            <View style={styles.optionsContainer}>
              {step.options.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionButton, { backgroundColor: T.surfaceCard, borderColor: T.border }]}
                  onPress={() => handleOptionSelect(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, { color: T.text }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                <Text style={[styles.skipText, { color: T.error }]}>Skip Tour</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: T.primary, shadowColor: T.primary }]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>Next 🚀</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tourBox: {
    position: 'absolute',
    width: width - 40,
    padding: 24,
    borderWidth: 1.5,
  },
  hostContainer: {
    position: 'absolute',
    top: -30,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
  },
  hostEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
  },
  optionButton: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  optionText: {
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
  },
  skipText: {
    fontWeight: '700',
    fontSize: 15,
    padding: 8,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  }
});
