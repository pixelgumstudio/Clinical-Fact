import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface ImageIconProps {
  size?: number;
  color?: string;
}

export const ImageIcon: React.FC<ImageIconProps> = ({ size = 24, color = '#6B7280' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path
        d="M21 15L16 10L5 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
