import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';

const { width, height } = Dimensions.get('window');

const splashImages = [
  require('../assets/images/splash/splash_screen-1.png'),
  require('../assets/images/splash/splash_screen-2.png'),
  require('../assets/images/splash/splash_screen-3.png'),
  require('../assets/images/splash/splash_screen-4.png'),
  require('../assets/images/splash/splash_screen-5.png'),
  require('../assets/images/splash/splash_screen-6.png'),
];

interface SplashScreenSequenceProps {
  onFinish: () => void;
}

export const SplashScreenSequence: React.FC<SplashScreenSequenceProps> = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < splashImages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1500); // 1.5 seconds per frame
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onFinish();
      }, 2000); // Wait 2 seconds on the last frame before transitioning
      return () => clearTimeout(timer);
    }
  }, [currentIndex, onFinish]);

  return (
    <View style={styles.container}>
      <AnimatePresence exitBeforeEnter>
        <MotiView
          key={currentIndex}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            type: 'timing',
            duration: 500,
          }}
          style={styles.imageContainer}
        >
          <Image
            source={splashImages[currentIndex]}
            style={styles.image}
            resizeMode="contain"
          />
        </MotiView>
      </AnimatePresence>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Assuming white background for splash
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.8,
    height: height * 0.8,
  },
});
