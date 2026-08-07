import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TextIconProps {
  size?: number;
  color?: string;
}

export const TextIcon: React.FC<TextIconProps> = ({ size = 24, color = '#6B7280' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V9M12 5V19M12 19H9M12 19H15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
