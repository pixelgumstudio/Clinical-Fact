import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface EmailIconProps {
  size?: number;
  color?: string;
}

export const EmailIcon: React.FC<EmailIconProps> = ({ 
  size = 20, 
  color = '#FFFFFF' 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.6011 16.8004C21.6009 17.7944 20.7953 18.6002 19.8013 18.6002H4.20166C3.20765 18.6002 2.40201 17.7944 2.40186 16.8004V10.5611L11.0542 13.8063C11.6651 14.0351 12.3388 14.0353 12.9497 13.8063L21.6011 10.5611V16.8004ZM19.8013 5.4C20.7953 5.4 21.6009 6.20583 21.6011 7.19981V8.70078C21.4962 8.7008 21.3896 8.71848 21.2856 8.75742L12.3179 12.1207C12.1143 12.197 11.8896 12.1969 11.686 12.1207L2.71826 8.75742C2.61414 8.71838 2.50692 8.70077 2.40186 8.70078V7.19981C2.40201 6.20583 3.20765 5.4 4.20166 5.4H19.8013Z"
      fill={color}
    />
  </Svg>
);