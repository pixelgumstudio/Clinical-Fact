import React from 'react';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface AuthIconProps {
  size?: number;
}


// Audio Waves Icon
export const LogoIcon: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad1" x1="-71.877" y1="24.8641" x2="106.24" y2="19.4141" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#CEF9D0" />
        <Stop offset="0.447558" stopColor="#DCEEB9" />
        <Stop offset="0.616371" stopColor="#FFB09C" />
        <Stop offset="0.778992" stopColor="#EBE19F" />
        <Stop offset="1" stopColor="#F3DA93" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad1)" stroke="url(#grad1)" strokeWidth="1.4" />
    <Path d="M28.4287 15.8469V41.0102" stroke="white" strokeWidth="2.8" />
    <Path d="M34.0205 21.4388V35.4183" stroke="white" strokeWidth="2.8" />
    <Path d="M39.6123 25.6326V31.2245" stroke="white" strokeWidth="2.8" />
    <Path d="M22.8369 21.4388V35.4183" stroke="white" strokeWidth="2.8" />
    <Path d="M17.2451 25.6326V31.2245" stroke="white" strokeWidth="2.8" />
  </Svg>
);

// Audio Waves Icon
export const AuthIcon1: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad1" x1="-71.877" y1="24.8641" x2="106.24" y2="19.4141" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad1)" stroke="url(#grad1)" strokeWidth="1.4" />
    <Path d="M28.4287 15.8469V41.0102" stroke="white" strokeWidth="2.8" />
    <Path d="M34.0205 21.4388V35.4183" stroke="white" strokeWidth="2.8" />
    <Path d="M39.6123 25.6326V31.2245" stroke="white" strokeWidth="2.8" />
    <Path d="M22.8369 21.4388V35.4183" stroke="white" strokeWidth="2.8" />
    <Path d="M17.2451 25.6326V31.2245" stroke="white" strokeWidth="2.8" />
  </Svg>
);

// Microphone Icon
export const AuthIcon2: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad2" x1="-158" y1="-43.6" x2="150" y2="0" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#CEF9D0" />
        <Stop offset="0.5" stopColor="#DCEEB9" />
        <Stop offset="0.65" stopColor="#FFB09C" />
        <Stop offset="0.75" stopColor="#ECE19F" />
        <Stop offset="0.9375" stopColor="#F9C597" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad2)" stroke="url(#grad2)" strokeWidth="1.4" />
    <Rect x="21.439" y="13.051" width="13.98" height="19.57" rx="6.99" fill="white" />
    <Path d="M17.9438 24.2347L18.1 27.0457C18.4046 32.5274 22.9384 36.8163 28.4285 36.8163M38.9132 24.2347L38.7571 27.0457C38.4525 32.5274 33.9187 36.8163 28.4285 36.8163M28.4285 36.8163V42.4081" stroke="white" strokeWidth="2.8" />
  </Svg>
);

// Play Button Icon
export const AuthIcon3: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad3" x1="-175" y1="4.6" x2="90.6" y2="19.9" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#F6FEE7" />
        <Stop offset="0.25" stopColor="#BEF164" />
        <Stop offset="0.5" stopColor="#B5D975" />
        <Stop offset="0.758" stopColor="#F0EAAA" />
        <Stop offset="0.875" stopColor="#D3E2B7" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad3)" stroke="url(#grad3)" strokeWidth="1.4" />
    <Path d="M37.4884 27.2148C38.4275 27.7514 38.4275 29.1056 37.4883 29.6423L22.1326 38.4171C21.2006 38.9496 20.041 38.2767 20.041 37.2033L20.041 19.6538C20.041 18.5804 21.2006 17.9075 22.1326 18.44L37.4884 27.2148Z" fill="white" />
  </Svg>
);

// Document Icon
export const AuthIcon4: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad4" x1="-71.877" y1="24.8641" x2="106.24" y2="19.4141" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad4)" stroke="url(#grad4)" strokeWidth="1.4" />
    <Path d="M36.6074 15.847C38.3445 15.847 39.7528 17.2555 39.7529 18.9926V37.8646C39.7529 39.6017 38.3446 41.0101 36.6074 41.0101H20.252C18.5149 41.0101 17.1065 39.6017 17.1064 37.8646V18.9926C17.1066 17.2555 18.5149 15.8471 20.252 15.847H36.6074ZM20.8809 33.7133V36.2299H35.9785V33.7133H20.8809ZM20.8809 27.4222V29.9388H32.2041V27.4222H20.8809ZM20.8809 21.1322V23.6478H27.6748V21.1322H20.8809Z" fill="white" />
  </Svg>
);

// Text/Typography Icon
export const AuthIcon5: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad5" x1="-158" y1="-43.6" x2="150" y2="0" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#CEF9D0" />
        <Stop offset="0.5" stopColor="#DCEEB9" />
        <Stop offset="0.65" stopColor="#FFB09C" />
        <Stop offset="0.75" stopColor="#ECE19F" />
        <Stop offset="0.9375" stopColor="#F9C597" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad5)" stroke="url(#grad5)" strokeWidth="1.4" />
    <Path d="M42.498 17.0544H42.7031V23.4928H39.9062V18.4528H29.8281V39.8024H34.8682V42.5993H21.9902V39.8024H27.0312V18.4528H16.9473V23.4928H14.1504V17.0544H14.335V15.6559H42.498V17.0544Z" fill="white" />
  </Svg>
);

// Flashcard/Heart Icon
export const AuthIcon6: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad6" x1="-175" y1="4.6" x2="90.6" y2="19.9" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#F6FEE7" />
        <Stop offset="0.25" stopColor="#BEF164" />
        <Stop offset="0.5" stopColor="#B5D975" />
        <Stop offset="0.758" stopColor="#F0EAAA" />
        <Stop offset="0.875" stopColor="#D3E2B7" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad6)" stroke="url(#grad6)" strokeWidth="1.4" />
    <Path d="M36.8164 14.4491C38.3605 14.4491 39.6123 15.7009 39.6123 17.245V39.6122C39.6123 41.1563 38.3605 42.4081 36.8164 42.4081H20.041C18.4969 42.4081 17.2451 41.1563 17.2451 39.6122V17.245C17.2451 15.7009 18.4969 14.4491 20.041 14.4491H36.8164ZM20.041 35.4188V38.2147H36.8164V35.4188H20.041ZM33.7734 19.8641C32.3199 18.4109 30.0604 18.2548 28.4336 19.3954C26.7996 18.2651 24.543 18.4254 23.0879 19.8798C21.4501 21.5175 21.4502 24.1736 23.0879 25.8114L28.4326 31.1571L31.3975 28.1913C31.5302 28.0585 31.6505 27.9174 31.7617 27.7723L33.7734 25.7626C35.4018 24.1339 35.4017 21.4928 33.7734 19.8641Z" fill="white" />
  </Svg>
);

// Image Icon
export const AuthIcon7: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad7" x1="-71.877" y1="24.8641" x2="106.24" y2="19.4141" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad7)" stroke="url(#grad7)" strokeWidth="1.4" />
    <Path d="M17.2451 36.7802V37.127C17.2451 38.1564 18.0796 38.9909 19.1091 38.9909H37.7485C38.7779 38.9909 39.6125 38.1564 39.6125 37.127V31.7711C39.6125 31.227 39.3747 30.71 38.9616 30.3559L36.5222 28.265C35.8044 27.6497 34.7396 27.6693 34.0449 28.3106L28.5021 33.427C27.767 34.1056 26.6272 34.0828 25.9198 33.3754L24.6379 32.0935C23.9664 31.4219 22.8972 31.3627 22.1555 31.956L17.9447 35.3247C17.5025 35.6784 17.2451 36.214 17.2451 36.7802Z" fill="white" />
    <Rect x="17.2451" y="17.2449" width="22.3673" height="22.3673" rx="1.86" stroke="white" strokeWidth="2.49" />
    <Circle cx="23.4579" cy="23.4581" r="2.49" fill="white" />
  </Svg>
);

// Quiz/Check Icon
export const AuthIcon8: React.FC<AuthIconProps> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="grad8" x1="-65.6" y1="6.6" x2="81.3" y2="20.6" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#CBEAFF" />
        <Stop offset="0.5" stopColor="#CBEAFF" />
        <Stop offset="0.65" stopColor="#DAFADB" />
        <Stop offset="0.75" stopColor="#CCFBF1" />
        <Stop offset="0.875" stopColor="#99F6E4" />
        <Stop offset="0.9375" stopColor="#2DD4C0" />
      </LinearGradient>
    </Defs>
    <Rect x="0.7" y="0.7" width="54.52" height="54.52" rx="16" fill="url(#grad8)" stroke="url(#grad8)" strokeWidth="1.4" />
    <Path d="M21.5312 14.4491C25.4429 14.4491 28.6143 17.6204 28.6143 21.5321C28.614 25.4436 25.4428 28.6141 21.5312 28.6141C17.6198 28.614 14.4494 25.4435 14.4492 21.5321C14.4492 17.6205 17.6197 14.4492 21.5312 14.4491ZM25.085 19.1552C24.8158 18.7559 24.2736 18.65 23.874 18.9188C22.9568 19.536 22.2593 20.0828 21.6465 20.7206C21.2379 21.1458 20.879 21.6001 20.5205 22.1219L19.252 21.0692C18.8812 20.7622 18.3309 20.8139 18.0234 21.1844C17.7163 21.5552 17.7682 22.1054 18.1387 22.413L20.1621 24.0917C20.3565 24.2528 20.6113 24.322 20.8604 24.2811C21.1098 24.24 21.3294 24.0921 21.4619 23.8768C21.9818 23.0321 22.4109 22.444 22.9053 21.9296C23.4 21.4148 23.9868 20.946 24.8486 20.3661C25.2482 20.0971 25.3539 19.5549 25.085 19.1552Z" fill="white" />
    <Path d="M35.5117 27.0307C39.4232 27.031 42.5938 30.2022 42.5938 34.1137C42.5935 38.0251 39.4231 41.1956 35.5117 41.1958C31.6002 41.1958 28.4289 38.0252 28.4287 34.1137C28.4287 30.202 31.6 27.0307 35.5117 27.0307ZM35.5127 32.8852L33.4688 30.8413L32.2344 32.0747L34.2793 34.1186L32.2461 36.1538L33.4795 37.3872L35.5137 35.352L37.5479 37.3862L38.7812 36.1528L36.7471 34.1186L38.792 32.0747L37.5576 30.8413L35.5127 32.8852Z" fill="white" />
    <Circle cx="35.4185" cy="20.0408" r="2.8" fill="white" />
    <Circle cx="21.439" cy="35.4184" r="2.8" fill="white" />
  </Svg>
);

// Mail Icon for Email Entry Screen (Pink background with envelope)
export const MailIcon: React.FC<AuthIconProps> = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <Rect width="80" height="80" rx="20" fill="#FFE4E6" />
    <Path
      d="M24 28C24 26.3431 25.3431 25 27 25H53C54.6569 25 56 26.3431 56 28V52C56 53.6569 54.6569 55 53 55H27C25.3431 55 24 53.6569 24 52V28Z"
      fill="#F87171"
    />
    <Path
      d="M24 28L40 42L56 28"
      stroke="#FFE4E6"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Back Arrow Icon
export const BackArrowIcon: React.FC<AuthIconProps & { color?: string }> = ({ size = 24, color = '#1F2937' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);