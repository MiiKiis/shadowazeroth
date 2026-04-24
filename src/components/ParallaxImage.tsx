'use client';

import React from 'react';

interface ParallaxImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  scale?: number;
  delay?: number;
  orientation?: "up" | "right" | "down" | "left" | "up left" | "up right" | "down left" | "down right";
  transition?: string;
  overflow?: boolean;
}

/**
 * Minimal image wrapper that keeps the previous component API stable.
 */
export default function ParallaxImage({ 
  scale = 1.2, 
  delay = 0.4, 
  orientation = 'up', 
  transition = 'cubic-bezier(0,0,0,1)',
  overflow = false,
  className = '',
  style,
  ...props 
}: ParallaxImageProps) {
  void scale;
  void delay;
  void orientation;
  void transition;
  void overflow;

  return (
    <img 
      className={className}
      style={{ 
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style 
      }}
      {...props} 
    />
  );
}
