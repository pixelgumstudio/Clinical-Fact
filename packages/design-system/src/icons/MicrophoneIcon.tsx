import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface MicrophoneIconProps {
  size?: number;
  color?: string;
}

export const MicrophoneIcon: React.FC<MicrophoneIconProps> = ({ size = 24, color = '#6B7280' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 10V12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12V10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 19V23"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
