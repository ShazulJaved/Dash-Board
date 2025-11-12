// hooks/useCountAnimation.ts
"use client";

import { useState, useEffect } from 'react';

export const useCountAnimation = (
  targetValue: number, 
  duration: number = 2000,
  format: 'percentage' | 'number' | 'days' | 'time' = 'number'
) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }

    let startTime: number;
    const startValue = 0;
    const endValue = targetValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;

      setCurrentValue(Math.floor(current));

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  // Format the output based on the type
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${currentValue}%`;
      case 'days':
        return `${currentValue} Days`;
      case 'time':
        return `${currentValue.toString().padStart(2, '0')}:00`;
      default:
        return currentValue.toString();
    }
  };

  return {
    rawValue: currentValue,
    displayValue: formatValue()
  };
};