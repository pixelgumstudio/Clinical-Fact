import React from 'react';
import Svg, { Path, Rect, Circle, Defs, ClipPath, LinearGradient, Stop } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// Tab Bar Icons
export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#BFBFBF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6.08114C3 5.43549 3.41315 4.86228 4.02566 4.65811L11.5257 2.15811C11.8336 2.05548 12.1664 2.05548 12.4743 2.15811L19.9743 4.65811C20.5869 4.86229 21 5.43549 21 6.08114V13.5C21 14.3284 20.3284 15 19.5 15H4.5C3.67157 15 3 14.3284 3 13.5V6.08114Z"
      stroke={color}
      strokeWidth="2"
    />
    <Rect x="3" y="17" width="18" height="4" stroke={color} strokeWidth="2" />
  </Svg>
);

export const HomeIconFilled: React.FC<IconProps> = ({ size = 24, color = '#1C1C1C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6.08114C3 5.43549 3.41315 4.86228 4.02566 4.65811L11.5257 2.15811C11.8336 2.05548 12.1664 2.05548 12.4743 2.15811L19.9743 4.65811C20.5869 4.86229 21 5.43549 21 6.08114V13.5C21 14.3284 20.3284 15 19.5 15H4.5C3.67157 15 3 14.3284 3 13.5V6.08114Z"
      fill={color}
    />
    <Rect x="3" y="17" width="18" height="4" fill={color} />
  </Svg>
);

export const LibraryIcon: React.FC<IconProps> = ({ size = 24, color = '#BFBFBF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.1416 4C8.67487 4.00015 9.16776 4.28354 9.43652 4.74414L10.5684 6.68457C10.8372 7.14537 11.3308 7.4287 11.8643 7.42871H20.5029C21.3313 7.42882 22.0029 8.10035 22.0029 8.92871V18.5C22.0029 19.3284 21.3313 19.9999 20.5029 20H3.50293C2.6745 20 2.00293 19.3284 2.00293 18.5V16.6006H21.999V14.334H2.00293V5.5C2.00293 4.67157 2.6745 4 3.50293 4H8.1416Z"
      stroke={color}
      strokeWidth="1.5"
    />
  </Svg>
);

export const LibraryIconFilled: React.FC<IconProps> = ({ size = 24, color = '#1C1C1C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.1416 4C8.67487 4.00015 9.16776 4.28354 9.43652 4.74414L10.5684 6.68457C10.8372 7.14537 11.3308 7.4287 11.8643 7.42871H20.5029C21.3313 7.42882 22.0029 8.10035 22.0029 8.92871V18.5C22.0029 19.3284 21.3313 19.9999 20.5029 20H3.50293C2.6745 20 2.00293 19.3284 2.00293 18.5V16.6006H21.999V14.334H2.00293V5.5C2.00293 4.67157 2.6745 4 3.50293 4H8.1416Z"
      fill={color}
    />
  </Svg>
);

export const ChatIcon: React.FC<IconProps> = ({ size = 24, color = '#BFBFBF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.002 2.3999C17.3226 2.4001 21.6356 6.09715 21.6357 10.6577C21.6357 16.3533 16.1817 19.7115 13.4809 21.0253C12.7732 21.3696 12.002 20.8396 12.002 20.0526C12.002 19.4246 11.4909 18.9216 10.8661 18.8587C6.08045 18.377 2.36719 14.8891 2.36719 10.6577C2.36731 6.09703 6.68113 2.3999 12.002 2.3999ZM9.24707 9.28174C8.48709 9.28174 7.87036 9.8978 7.87012 10.6577C7.87012 11.4178 8.48694 12.0347 9.24707 12.0347C10.007 12.0344 10.623 11.4177 10.623 10.6577C10.6228 9.89794 10.0069 9.28197 9.24707 9.28174ZM14.7549 9.28174C13.9949 9.28174 13.3782 9.8978 13.3779 10.6577C13.3779 11.4178 13.9948 12.0347 14.7549 12.0347C15.5148 12.0344 16.1309 11.4177 16.1309 10.6577C16.1306 9.89794 15.5147 9.28197 14.7549 9.28174Z"
      stroke={color}
      strokeWidth="1.5"
    />
  </Svg>
);

export const ChatIconFilled: React.FC<IconProps> = ({ size = 24, color = '#1C1C1C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.002 2.3999C17.3226 2.4001 21.6356 6.09715 21.6357 10.6577C21.6357 16.3533 16.1817 19.7115 13.4809 21.0253C12.7732 21.3696 12.002 20.8396 12.002 20.0526C12.002 19.4246 11.4909 18.9216 10.8661 18.8587C6.08045 18.377 2.36719 14.8891 2.36719 10.6577C2.36731 6.09703 6.68113 2.3999 12.002 2.3999ZM9.24707 9.28174C8.48709 9.28174 7.87036 9.8978 7.87012 10.6577C7.87012 11.4178 8.48694 12.0347 9.24707 12.0347C10.007 12.0344 10.623 11.4177 10.623 10.6577C10.6228 9.89794 10.0069 9.28197 9.24707 9.28174ZM14.7549 9.28174C13.9949 9.28174 13.3782 9.8978 13.3779 10.6577C13.3779 11.4178 13.9948 12.0347 14.7549 12.0347C15.5148 12.0344 16.1309 11.4177 16.1309 10.6577C16.1306 9.89794 15.5147 9.28197 14.7549 9.28174Z"
      fill={color}
    />
  </Svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 24, color = '#BFBFBF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12.0002" cy="6.23991" r="3.84" stroke={color} strokeWidth="1.5" />
    <Path
      d="M3.04102 16.4804C3.04102 13.654 7.04102 11.3604 12.001 11.3604C16.961 11.3604 20.961 13.654 20.961 16.4804C20.961 19.3068 16.961 21.6004 12.001 21.6004C7.04102 21.6004 3.04102 19.3068 3.04102 16.4804Z"
      stroke={color}
      strokeWidth="1.5"
    />
  </Svg>
);

export const ProfileIconFilled: React.FC<IconProps> = ({ size = 24, color = '#1C1C1C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12.0002" cy="6.23991" r="3.84" fill={color} />
    <Path
      d="M3.04102 16.4804C3.04102 13.654 7.04102 11.3604 12.001 11.3604C16.961 11.3604 20.961 13.654 20.961 16.4804C20.961 19.3068 16.961 21.6004 12.001 21.6004C7.04102 21.6004 3.04102 19.3068 3.04102 16.4804Z"
      fill={color}
    />
  </Svg>
);

// Header Icons
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4 6L8 10L12 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Create Note Modal Icons
export const RecordAudioIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Rect x="15" y="10" width="10" height="14" rx="5" fill={color} />
    <Path
      d="M12 20V21C12 25.4183 15.5817 29 20 29M28 20V21C28 25.4183 24.4183 29 20 29M20 29V32"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const UploadAudioIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Path
      d="M20 28V16M20 16L15 21M20 16L25 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 24V26C12 27.1046 12.8954 28 14 28H26C27.1046 28 28 27.1046 28 26V24"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const YoutubeIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Path
      d="M29.5 14.5C29.3 13.6 28.6 12.9 27.7 12.7C26.1 12.3 20 12.3 20 12.3C20 12.3 13.9 12.3 12.3 12.7C11.4 12.9 10.7 13.6 10.5 14.5C10.1 16.1 10.1 19.5 10.1 19.5C10.1 19.5 10.1 22.9 10.5 24.5C10.7 25.4 11.4 26.1 12.3 26.3C13.9 26.7 20 26.7 20 26.7C20 26.7 26.1 26.7 27.7 26.3C28.6 26.1 29.3 25.4 29.5 24.5C29.9 22.9 29.9 19.5 29.9 19.5C29.9 19.5 29.9 16.1 29.5 14.5Z"
      fill={color}
    />
    <Path d="M17.5 23L23.5 19.5L17.5 16V23Z" fill="white" />
  </Svg>
);

export const PDFDocumentIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Path
      d="M14 12H22L28 18V28C28 29.1046 27.1046 30 26 30H14C12.8954 30 12 29.1046 12 28V14C12 12.8954 12.8954 12 14 12Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M22 12V18H28" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <Path d="M16 22H24M16 26H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const CustomTextIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Path
      d="M12 14H28M20 14V28M16 28H24"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ImageIcon: React.FC<IconProps> = ({ size = 40, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="12" fill="#FEE2E2" />
    <Rect x="10" y="12" width="20" height="16" rx="2" stroke={color} strokeWidth="2" />
    <Circle cx="15" cy="17" r="2" fill={color} />
    <Path
      d="M10 24L15 20L18 23L24 18L30 24V26C30 27.1046 29.1046 28 28 28H12C10.8954 28 10 27.1046 10 26V24Z"
      fill={color}
    />
  </Svg>
);

// Empty State Icon
export const EmptyFolderIcon: React.FC<IconProps> = ({ size = 80, color = '#D1D5DB' }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <Path
      d="M16 24C16 21.7909 17.7909 20 20 20H32L38 28H60C62.2091 28 64 29.7909 64 32V56C64 58.2091 62.2091 60 60 60H20C17.7909 60 16 58.2091 16 56V24Z"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M32 44H48"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </Svg>
);

// Search and Filter Icons
export const SearchIcon: React.FC<IconProps> = ({ size = 20, color = '#9CA3AF' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 19L14.65 14.65"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const FilterIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M18 2H2L8 9.46V14L12 16V9.46L18 2Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Note Type Icons for Library
export const BackupIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 4V2M12 4C7.58172 4 4 7.58172 4 12M12 4C16.4183 4 20 7.58172 20 12M4 12H2M4 12C4 16.4183 7.58172 20 12 20M20 12H22M20 12C20 16.4183 16.4183 20 12 20M12 20V22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M15 9L12 12M12 12L9 15M12 12L15 15M12 12L9 9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const TranscriptIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M8 9H16M8 12H16M8 15H12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Close Icon
export const CloseIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron Right Icon
export const ChevronRightIcon: React.FC<IconProps> = ({ size = 20, color = '#9CA3AF' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M7.5 15L12.5 10L7.5 5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Feature Card Icons (for home screen cards)
export const CreateNotesIcon: React.FC<IconProps> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Rect x="6" y="4" width="20" height="24" rx="2" fill="white" fillOpacity="0.9" />
    <Path d="M10 10H22M10 14H22M10 18H18" stroke="#C4B5A4" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="24" cy="24" r="6" fill="white" />
    <Path d="M24 21V27M21 24H27" stroke="#C4B5A4" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const ChatPDFIcon: React.FC<IconProps> = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M8 6H18L24 12V26C24 27.1046 23.1046 28 22 28H8C6.89543 28 6 27.1046 6 26V8C6 6.89543 6.89543 6 8 6Z"
      fill="white"
      fillOpacity="0.9"
    />
    <Path d="M18 6V12H24" fill="white" fillOpacity="0.7" />
    <Circle cx="22" cy="22" r="8" fill="white" />
    <Path
      d="M19 19H25M19 22H25M19 25H23"
      stroke="#C4B5A4"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

// Audio Wave Logo Icon (smaller version for header)
export const AudioWaveLogoIcon: React.FC<IconProps> = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Rect width="28" height="28" rx="8" fill="#E8D5C4" />
    <Path d="M14 7V21" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M17.5 10V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M21 12V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M10.5 10V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M7 12V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Note Detail Screen Icons
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, color = '#1F2937' }) => (
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

export const MoreVerticalIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="1.5" fill={color} />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
    <Circle cx="12" cy="19" r="1.5" fill={color} />
  </Svg>
);

export const FolderAddIcon: React.FC<IconProps> = ({ size = 20, color = '#F97316' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3 5C3 3.89543 3.89543 3 5 3H7.58579C7.851 3 8.10536 3.10536 8.29289 3.29289L9.70711 4.70711C9.89464 4.89464 10.149 5 10.4142 5H15C16.1046 5 17 5.89543 17 7V14C17 15.1046 16.1046 16 15 16H5C3.89543 16 3 15.1046 3 14V5Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M10 9V13M8 11H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const TranslateIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3 5H11M7 3V5M9 5C9 8.5 6.5 11 3 12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 9C5.5 10.5 7 12 9 12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11 18L14 10L17 18M12 16H16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TranscribeIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect x="3" y="3" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5" />
    <Path d="M6 7H14M6 10H14M6 13H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const EditPencilIcon: React.FC<IconProps> = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.166 2.5C14.3849 2.28113 14.6447 2.10752 14.9307 1.98906C15.2167 1.87061 15.5232 1.80965 15.8327 1.80965C16.1422 1.80965 16.4487 1.87061 16.7347 1.98906C17.0206 2.10752 17.2805 2.28113 17.4993 2.5C17.7182 2.71887 17.8918 2.97871 18.0103 3.26468C18.1287 3.55064 18.1897 3.85714 18.1897 4.16667C18.1897 4.4762 18.1287 4.7827 18.0103 5.06866C17.8918 5.35463 17.7182 5.61447 17.4993 5.83333L6.24935 17.0833L1.66602 18.3333L2.91602 13.75L14.166 2.5Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const FlashcardIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect x="6" y="8" width="28" height="20" rx="3" fill="white" fillOpacity="0.3" />
    <Rect x="10" y="12" width="20" height="16" rx="2" fill="white" fillOpacity="0.6" />
    <Path d="M15 18H25M15 22H22" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const DocumentFileIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="20" fill="#E8F5E9" />
    <Path
      d="M14 12H22L26 16V28C26 28.5523 25.5523 29 25 29H14C13.4477 29 13 28.5523 13 28V13C13 12.4477 13.4477 12 14 12Z"
      fill="#4CAF50"
    />
    <Path d="M22 12V16H26" fill="#81C784" />
    <Path d="M16 20H24M16 23H24M16 26H20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 20, color = '#10B981' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M16.6663 5L7.49967 14.1667L3.33301 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Note Options Modal Icons
export const EditNoteIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Path
      d="M24.166 12.5C24.3849 12.2811 24.6447 12.1075 24.9307 11.9891C25.2167 11.8706 25.5232 11.8096 25.8327 11.8096C26.1422 11.8096 26.4487 11.8706 26.7347 11.9891C27.0206 12.1075 27.2805 12.2811 27.4993 12.5C27.7182 12.7189 27.8918 12.9787 28.0103 13.2647C28.1287 13.5506 28.1897 13.8571 28.1897 14.1667C28.1897 14.4762 28.1287 14.7827 28.0103 15.0687C27.8918 15.3546 27.7182 15.6145 27.4993 15.8333L16.2493 27.0833L11.666 28.3333L12.916 23.75L24.166 12.5Z"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ExportIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Path
      d="M20 12V22M20 12L16 16M20 12L24 16"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 22V26C12 27.1046 12.8954 28 14 28H26C27.1046 28 28 27.1046 28 26V22"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShareLinkIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Path
      d="M17 23C17 23 14 23 14 20C14 17 17 17 17 17M23 17C23 17 26 17 26 20C26 23 23 23 23 23M16 20H24"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PrintIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Path
      d="M15 17V11H25V17M15 25H13C12.4477 25 12 24.5523 12 24V19C12 18.4477 12.4477 18 13 18H27C27.5523 18 28 18.4477 28 19V24C28 24.5523 27.5523 25 27 25H25M15 22H25V29H15V22Z"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DeleteIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FEE2E2" />
    <Path
      d="M13 15H27M17 15V13C17 12.4477 17.4477 12 18 12H22C22.5523 12 23 12.4477 23 13V15M25 15V27C25 27.5523 24.5523 28 24 28H16C15.4477 28 15 27.5523 15 27V15H25Z"
      stroke="#EF4444"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M18 19V24M22 19V24" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const DeleteLargeIcon: React.FC<IconProps> = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Circle cx="32" cy="32" r="32" fill="#FFEDD5" />
    <Path
      d="M24 28H40M28 28V26C28 25.4477 28.4477 25 29 25H35C35.5523 25 36 25.4477 36 26V28M38 28V40C38 40.5523 37.5523 41 37 41H27C26.4477 41 26 40.5523 26 40V28H38Z"
      stroke="#F97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M30 32V37M34 32V37" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const QuizIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect x="8" y="6" width="24" height="28" rx="3" fill="white" fillOpacity="0.6" />
    <Circle cx="14" cy="14" r="3" fill="#3B82F6" />
    <Path d="M20 14H28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="14" cy="22" r="3" stroke="#3B82F6" strokeWidth="1.5" />
    <Path d="M20 22H28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="14" cy="30" r="3" stroke="#3B82F6" strokeWidth="1.5" />
    <Path d="M20 30H28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const RadioSelectedIcon: React.FC<IconProps> = ({ size = 20, color = '#F97316' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="9" stroke={color} strokeWidth="2" />
    <Circle cx="10" cy="10" r="5" fill={color} />
  </Svg>
);

export const RadioUnselectedIcon: React.FC<IconProps> = ({ size = 20, color = '#D1D5DB' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="9" stroke={color} strokeWidth="2" />
  </Svg>
);

export const ExportSummaryIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Rect x="12" y="11" width="16" height="18" rx="2" stroke="#F97316" strokeWidth="1.5" />
    <Path d="M15 16H25M15 20H25M15 24H21" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const ExportTranscriptIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Rect x="12" y="11" width="16" height="18" rx="2" stroke="#F97316" strokeWidth="1.5" />
    <Path d="M15 15H17M15 19H25M15 23H25M15 27H20" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export const ExportAudioIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx="20" cy="20" r="20" fill="#FFEDD5" />
    <Path d="M20 12V28" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    <Path d="M24 16V24" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    <Path d="M28 18V22" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    <Path d="M16 16V24" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 18V22" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Folder Icons
export const FolderColorIcon: React.FC<IconProps & { folderColor?: string }> = ({
  size = 40,
  folderColor = '#10B981'
}) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Path
      d="M6 12C6 10.3431 7.34315 9 9 9H15.3431C15.8735 9 16.3823 9.21071 16.7574 9.58579L18.4142 11.2426C18.7893 11.6177 19.2981 11.8284 19.8284 11.8284H31C32.6569 11.8284 34 13.1716 34 14.8284V28C34 29.6569 32.6569 31 31 31H9C7.34315 31 6 29.6569 6 28V12Z"
      fill={folderColor}
    />
  </Svg>
);

export const EmptyFolderLargeIcon: React.FC<IconProps> = ({ size = 64, color = '#D1D5DB' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path
      d="M10 20C10 17.7909 11.7909 16 14 16H24L28 22H50C52.2091 22 54 23.7909 54 26V46C54 48.2091 52.2091 50 50 50H14C11.7909 50 10 48.2091 10 46V20Z"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 3V13M3 8H13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const FolderCheckIcon: React.FC<IconProps> = ({ size = 20, color = '#10B981' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M16.6663 5L7.49967 14.1667L3.33301 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Upload Audio Icons
export const CloudUploadIcon: React.FC<IconProps> = ({ size = 80, color = '#9CA3AF' }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <Circle cx="40" cy="40" r="40" fill="#F3F4F6" />
    <Path
      d="M40 52V36M40 36L34 42M40 36L46 42"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M52 46C54.7614 46 57 43.7614 57 41C57 38.2386 54.7614 36 52 36C51.8235 36 51.6488 36.0078 51.4762 36.0231C51.8236 34.918 52 33.7335 52 32.5C52 26.701 47.299 22 41.5 22C36.5788 22 32.4423 25.3612 31.3322 29.9088C30.9057 29.8044 30.459 29.75 30 29.75C26.5482 29.75 23.75 32.5482 23.75 36C23.75 36.4178 23.7876 36.8269 23.8598 37.2241C21.5868 38.3118 20 40.6434 20 43.3333C20 47.0152 22.9848 50 26.6667 50H28"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const AudioFileIcon: React.FC<IconProps> = ({ size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="24" fill="#FEF3C7" />
    <Path d="M24 14V34" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M29 18V30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M34 21V27" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M19 18V30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M14 21V27" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

export const ProgressCircleCompleteIcon: React.FC<IconProps> = ({ size = 24, color = '#10B981' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="12" fill={color} />
    <Path
      d="M7 12L10.5 15.5L17 9"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ProgressCircleActiveIcon: React.FC<IconProps> = ({ size = 24, color = '#F59E0B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
  </Svg>
);

export const ProgressCirclePendingIcon: React.FC<IconProps> = ({ size = 24, color = '#E5E7EB' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
  </Svg>
);

export const ChangeFileIcon: React.FC<IconProps> = ({ size = 16, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M13.5 8.5V12.5C13.5 13.0523 13.0523 13.5 12.5 13.5H3.5C2.94772 13.5 2.5 13.0523 2.5 12.5V3.5C2.5 2.94772 2.94772 2.5 3.5 2.5H7.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11 2L14 5M14 2L11 5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// YouTube Play Icon for video thumbnail
export const PlayCircleIcon: React.FC<IconProps> = ({ size = 48, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.5)" />
    <Path
      d="M19 16L33 24L19 32V16Z"
      fill={color}
    />
  </Svg>
);

// Timer Icon for quiz
export const TimerIcon: React.FC<IconProps> = ({ size = 24, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth="2" />
    <Path d="M12 9V13L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 2H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 2V4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Minus Icon for counter
export const MinusIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Quiz Card Icon for Create Quiz modal
export const QuizCardIcon: React.FC<IconProps> = ({ size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Rect x="8" y="8" width="32" height="32" rx="8" fill="#E8F5E9" />
    <Circle cx="18" cy="20" r="4" fill="#4CAF50" />
    <Path d="M26 20H36" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" />
    <Circle cx="18" cy="32" r="4" stroke="#4CAF50" strokeWidth="2" />
    <Path d="M26 32H36" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// Radio Button Icons for quiz options
export const RadioEmptyIcon: React.FC<IconProps> = ({ size = 24, color = '#D1D5DB' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
  </Svg>
);

export const RadioFilledIcon: React.FC<IconProps> = ({ size = 24, color = '#FED7AA' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={color} stroke={color} strokeWidth="2" />
  </Svg>
);

export const RadioCorrectIcon: React.FC<IconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="12" fill="#10B981" />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const RadioWrongIcon: React.FC<IconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="12" fill="#EF4444" />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Score Circle for report card (decorative arc)
export const ScoreCircleIcon: React.FC<IconProps & { percentage?: number }> = ({
  size = 160,
  percentage = 60
}) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id="scoreGradient">
          <Circle cx={size/2} cy={size/2} r={radius} />
        </ClipPath>
      </Defs>
      {/* Background circle */}
      <Circle
        cx={size/2}
        cy={size/2}
        r={radius}
        stroke="#F3F4F6"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress arc with gradient effect */}
      <Circle
        cx={size/2}
        cy={size/2}
        r={radius}
        stroke="#F59E0B"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </Svg>
  );
};

// ==========================================
// Gradient Icons from Design Files
// ==========================================

// FAB Plus Button Icon (for footer)
export const FABPlusIcon: React.FC<IconProps> = ({ size = 44 }) => {
  const height = (size / 44) * 28;
  return (
    <Svg width={size} height={height} viewBox="0 0 44 28" fill="none">
      <Defs>
        <LinearGradient id="fabPlusGradient" x1="-56.5573" y1="12.4502" x2="83.4036" y2="5.7206" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFEBEA" />
          <Stop offset="0.447558" stopColor="#CBEAFF" />
          <Stop offset="0.616371" stopColor="#FBD0CD" />
          <Stop offset="0.778992" stopColor="#B9EDBA" />
          <Stop offset="0.95" stopColor="#B9EDBA" />
          <Stop offset="1" stopColor="#FCFEFF" />
        </LinearGradient>
      </Defs>
      <Rect width="44" height="28" rx="14" fill="url(#fabPlusGradient)" />
      <Path d="M22 8L22 20" stroke="white" strokeWidth="2" strokeLinecap="square" />
      <Path d="M28 14L16 14" stroke="white" strokeWidth="2" strokeLinecap="square" />
    </Svg>
  );
};

// Record Audio Icon with Gradient (for Create Note Modal)
export const RecordAudioGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="recordAudioGradient" x1="-51.4157" y1="17.786" x2="75.9963" y2="13.8875" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="0.95" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#recordAudioGradient)" stroke="url(#recordAudioGradient)" />
    <Path d="M20 11L20 29" stroke="white" strokeWidth="2" />
    <Path d="M24 15L24 25" stroke="white" strokeWidth="2" />
    <Path d="M28 18L28 22" stroke="white" strokeWidth="2" />
    <Path d="M16 15L16 25" stroke="white" strokeWidth="2" />
    <Path d="M12 18L12 22" stroke="white" strokeWidth="2" />
  </Svg>
);

// Upload Audio Icon with Gradient (for Create Note Modal)
export const UploadAudioGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="uploadAudioGradient" x1="-113.093" y1="-31.2177" x2="107.456" y2="-0.045071" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#CEF9D0" />
        <Stop offset="0.5" stopColor="#DCEEB9" />
        <Stop offset="0.65" stopColor="#FFB09C" />
        <Stop offset="0.75" stopColor="#ECE19F" />
        <Stop offset="0.875" stopColor="#F3DA93" />
        <Stop offset="0.9375" stopColor="#F9C597" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#uploadAudioGradient)" stroke="url(#uploadAudioGradient)" />
    <Rect x="15" y="9" width="10" height="14" rx="5" fill="white" />
    <Path d="M12.5 17L12.6117 19.0108C12.8296 22.932 16.0727 26 20 26M27.5 17L27.3883 19.0108C27.1704 22.932 23.9273 26 20 26M20 26V30" stroke="white" strokeWidth="2" />
  </Svg>
);

// Youtube Video Icon with Gradient (for Create Note Modal)
export const YoutubeGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="youtubeGradient" x1="-125.537" y1="3.32104" x2="64.8538" y2="14.2397" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#F6FEE7" />
        <Stop offset="0.25" stopColor="#BEF164" />
        <Stop offset="0.5" stopColor="#B5D975" />
        <Stop offset="0.758329" stopColor="#F0EAAA" />
        <Stop offset="0.778992" stopColor="#E9E290" />
        <Stop offset="0.875" stopColor="#D3E2B7" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#youtubeGradient)" stroke="url(#youtubeGradient)" />
    <Path d="M26.4806 19.1318C27.1524 19.5157 27.1524 20.4844 26.4806 20.8682L15.4961 27.1451C14.8295 27.526 14 27.0446 14 26.2768L14 13.7232C14 12.9554 14.8295 12.474 15.4961 12.8549L26.4806 19.1318Z" fill="white" />
  </Svg>
);

// PDF Document Icon with Gradient (for Create Note Modal)
export const PDFDocumentGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="pdfGradient" x1="-51.4157" y1="17.786" x2="75.9963" y2="13.8875" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="0.95" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#pdfGradient)" stroke="url(#pdfGradient)" />
    <Path d="M25.8501 11C27.0926 11 28.0999 12.0075 28.1001 13.25V26.75C28.0999 27.9925 27.0926 29 25.8501 29H14.1499C12.9077 28.9997 11.9001 27.9923 11.8999 26.75V13.25C11.9001 12.0077 12.9077 11.0003 14.1499 11H25.8501ZM14.6001 23.7803V25.5811H25.3999V23.7803H14.6001ZM14.6001 19.2803V21.0811H22.6997V19.2803H14.6001ZM14.6001 14.7803V16.5811H19.4604V14.7803H14.6001Z" fill="white" />
  </Svg>
);

// Custom Text Icon with Gradient (for Create Note Modal)
export const CustomTextGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="customTextGradient" x1="-113.093" y1="-31.2177" x2="107.456" y2="-0.045071" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#CEF9D0" />
        <Stop offset="0.5" stopColor="#DCEEB9" />
        <Stop offset="0.65" stopColor="#FFB09C" />
        <Stop offset="0.75" stopColor="#ECE19F" />
        <Stop offset="0.875" stopColor="#F3DA93" />
        <Stop offset="0.9375" stopColor="#F9C597" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#customTextGradient)" stroke="url(#customTextGradient)" />
    <Path d="M30.0635 11.8633H30.2109V16.4688H28.2109V12.8633H21V28.1367H24.6064V30.1367H15.3945V28.1367H19V12.8633H11.7861V16.4688H9.78613V11.8633H9.91797V10.8633H30.0635V11.8633Z" fill="white" />
  </Svg>
);

// Image Icon with Gradient (for Create Note Modal)
export const ImageGradientIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="imageGradient" x1="-51.4157" y1="17.786" x2="75.9963" y2="13.8875" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="0.95" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="11.5" fill="url(#imageGradient)" stroke="url(#imageGradient)" />
    <Path d="M12 25.9744V26.2224C12 26.9588 12.597 27.5558 13.3333 27.5558H26.6667C27.403 27.5558 28 26.9588 28 26.2224V22.3912C28 22.002 27.8299 21.6322 27.5344 21.3789L25.7894 19.8832C25.276 19.4431 24.5143 19.4571 24.0173 19.9158L20.0524 23.5757C19.5266 24.0611 18.7113 24.0448 18.2053 23.5388L17.2883 22.6218C16.8079 22.1414 16.0431 22.0991 15.5126 22.5235L12.5004 24.9332C12.1841 25.1863 12 25.5693 12 25.9744Z" fill="white" />
    <Rect x="12" y="12" width="16" height="16" rx="1.33333" stroke="white" strokeWidth="1.77778" />
    <Circle cx="16.4443" cy="16.4443" r="1.77778" fill="white" />
  </Svg>
);

// ==========================================
// File Preview Icons (Gray circular icons for generating/detail screens)
// ==========================================

// Audio File Preview Icon (gray circular)
export const AudioFilePreviewIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="20" fill="#F9F9F9" />
    <Circle cx="20" cy="20" r="15.5" fill="#F9F9F9" stroke="#F9F9F9" />
    <Path d="M20 11L20 29" stroke="#8B8B8B" strokeWidth="2" />
    <Path d="M24 15L24 25" stroke="#8B8B8B" strokeWidth="2" />
    <Path d="M28 18L28 22" stroke="#8B8B8B" strokeWidth="2" />
    <Path d="M16 15L16 25" stroke="#8B8B8B" strokeWidth="2" />
    <Path d="M12 18L12 22" stroke="#8B8B8B" strokeWidth="2" />
  </Svg>
);

// Video File Preview Icon (gray circular - play button)
export const VideoFilePreviewIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="20" fill="#F9F9F9" />
    <Circle cx="20" cy="20" r="15.5" fill="#F9F9F9" stroke="#F9F9F9" />
    <Path d="M26.4806 19.1318C27.1524 19.5157 27.1524 20.4844 26.4806 20.8682L15.4961 27.1451C14.8295 27.526 14 27.0446 14 26.2768L14 13.7232C14 12.9554 14.8295 12.474 15.4961 12.8549L26.4806 19.1318Z" fill="#8B8B8B" />
  </Svg>
);

// Note File Preview Icon (gray circular - document with lines)
export const NoteFilePreviewIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="20" fill="#F9F9F9" />
    <Circle cx="20" cy="20" r="15.5" fill="#F9F9F9" stroke="#F9F9F9" />
    <Path d="M16.4428 15.7333H18.5762M16.4428 20H21.7762M16.4428 24.2667H23.554M14.222 28H25.7776C26.5139 28 27.1109 27.403 27.1109 26.6667V13.3333C27.1109 12.597 26.5139 12 25.7776 12L14.222 12C13.4856 12 12.8887 12.597 12.8887 13.3333V26.6667C12.8887 27.403 13.4856 28 14.222 28Z" stroke="#A6A6A6" strokeWidth="1.77778" />
  </Svg>
);

// Transcript File Preview Icon (gray circular - microphone)
export const TranscriptFilePreviewIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width="40" height="40" rx="20" fill="#F9F9F9" />
    <Circle cx="20" cy="20" r="15.5" fill="#F9F9F9" stroke="#F9F9F9" />
    <Rect x="15" y="9" width="10" height="14" rx="5" fill="#8B8B8B" />
    <Path d="M12.5 17L12.6117 19.0108C12.8296 22.932 16.0727 26 20 26M27.5 17L27.3883 19.0108C27.1704 22.932 23.9273 26 20 26M20 26V30" stroke="#8B8B8B" strokeWidth="2" />
  </Svg>
);

// ==========================================
// Chat Feature Icons
// ==========================================

// Notechat Logo Icon (chat bubble with eyes - gradient)
export const NotechatLogoIcon: React.FC<IconProps> = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 106 106" fill="none">
    <Defs>
      <LinearGradient id="notechatGradient" x1="0" y1="0" x2="106" y2="106" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFE4E1" />
        <Stop offset="0.5" stopColor="#E8D5C4" />
        <Stop offset="1" stopColor="#D4A574" />
      </LinearGradient>
    </Defs>
    <Path
      d="M95.5584 47.073C95.5584 80.5064 53.0067 95.7034 53.0067 95.7034C53.0067 92.3072 53.0067 92.2226 53.0067 83.5458C29.5061 83.5458 10.4551 67.2164 10.4551 47.073C10.4551 26.9296 29.5061 10.6001 53.0067 10.6001C76.5074 10.6001 95.5584 26.9296 95.5584 47.073Z"
      fill="url(#notechatGradient)"
    />
    <Circle cx="40.8381" cy="47.0734" r="6.07881" fill="white" />
    <Circle cx="65.1643" cy="47.0734" r="6.07881" fill="white" />
  </Svg>
);

// Chat with Note Icon (gradient)
export const ChatWithNoteIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="chatNoteGradient" x1="-51.4157" y1="17.786" x2="75.9963" y2="13.8875" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFEBEA" />
        <Stop offset="0.447558" stopColor="#CBEAFF" />
        <Stop offset="0.616371" stopColor="#FBD0CD" />
        <Stop offset="0.778992" stopColor="#B9EDBA" />
        <Stop offset="0.95" stopColor="#B9EDBA" />
        <Stop offset="1" stopColor="#FCFEFF" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="19.5" fill="url(#chatNoteGradient)" stroke="url(#chatNoteGradient)" />
    <Path d="M16.4428 15.7333H18.5762M16.4428 20H21.7762M16.4428 24.2667H23.554M14.222 28H25.7776C26.5139 28 27.1109 27.403 27.1109 26.6667V13.3333C27.1109 12.597 26.5139 12 25.7776 12L14.222 12C13.4856 12 12.8887 12.597 12.8887 13.3333V26.6667C12.8887 27.403 13.4856 28 14.222 28Z" stroke="white" strokeWidth="1.77778" />
  </Svg>
);

// Chat with Image Icon (gradient)
export const ChatWithImageIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="chatImageGradient" x1="-113.093" y1="-31.2177" x2="107.456" y2="-0.045071" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#CEF9D0" />
        <Stop offset="0.5" stopColor="#DCEEB9" />
        <Stop offset="0.65" stopColor="#FFB09C" />
        <Stop offset="0.75" stopColor="#ECE19F" />
        <Stop offset="0.875" stopColor="#F3DA93" />
        <Stop offset="0.9375" stopColor="#F9C597" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="19.5" fill="url(#chatImageGradient)" stroke="url(#chatImageGradient)" />
    <Path d="M12 25.9744V26.2224C12 26.9588 12.597 27.5558 13.3333 27.5558H26.6667C27.403 27.5558 28 26.9588 28 26.2224V22.3912C28 22.002 27.8299 21.6322 27.5344 21.3789L25.7894 19.8832C25.276 19.4431 24.5143 19.4571 24.0173 19.9158L20.0524 23.5757C19.5266 24.0611 18.7113 24.0448 18.2053 23.5388L17.2883 22.6218C16.8079 22.1414 16.0431 22.0991 15.5126 22.5235L12.5004 24.9332C12.1841 25.1863 12 25.5693 12 25.9744Z" fill="white" />
    <Rect x="12" y="12" width="16" height="16" rx="1.33333" stroke="white" strokeWidth="1.77778" />
    <Circle cx="16.4443" cy="16.4443" r="1.77778" fill="white" />
  </Svg>
);

// Chat with Document Icon (gradient)
export const ChatWithDocumentIcon: React.FC<IconProps> = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Defs>
      <LinearGradient id="chatDocGradient" x1="-125.537" y1="3.32104" x2="64.8538" y2="14.2397" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#F6FEE7" />
        <Stop offset="0.25" stopColor="#BEF164" />
        <Stop offset="0.5" stopColor="#B5D975" />
        <Stop offset="0.758329" stopColor="#F0EAAA" />
        <Stop offset="0.778992" stopColor="#E9E290" />
        <Stop offset="0.875" stopColor="#D3E2B7" />
      </LinearGradient>
    </Defs>
    <Rect x="0.5" y="0.5" width="39" height="39" rx="19.5" fill="url(#chatDocGradient)" stroke="url(#chatDocGradient)" />
    <Path d="M25.8501 11C27.0926 11 28.0999 12.0075 28.1001 13.25V26.75C28.0999 27.9925 27.0926 29 25.8501 29H14.1499C12.9077 28.9997 11.9001 27.9923 11.8999 26.75V13.25C11.9001 12.0077 12.9077 11.0003 14.1499 11H25.8501ZM14.6001 23.7803V25.5811H25.3999V23.7803H14.6001ZM14.6001 19.2803V21.0811H22.6997V19.2803H14.6001ZM14.6001 14.7803V16.5811H19.4604V14.7803H14.6001Z" fill="white" />
  </Svg>
);

// Send Message Icon
export const SendMessageIcon: React.FC<IconProps> = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Attachment Icon
export const AttachmentIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59723 21.9983 8.005 21.9983C6.41277 21.9983 4.88583 21.3658 3.76 20.24C2.63417 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63417 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42975 14.0991 2.00813 15.16 2.00813C16.2209 2.00813 17.2394 2.42975 17.99 3.18C18.7403 3.93063 19.1619 4.94913 19.1619 6.01C19.1619 7.07087 18.7403 8.08937 17.99 8.84L9.41 17.41C9.03472 17.7853 8.52573 17.9961 7.995 17.9961C7.46427 17.9961 6.95528 17.7853 6.58 17.41C6.20472 17.0347 5.99391 16.5257 5.99391 15.995C5.99391 15.4643 6.20472 14.9553 6.58 14.58L15.07 6.1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Microphone Icon for voice input
export const MicrophoneIcon: React.FC<IconProps> = ({ size = 24, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 19V23M8 23H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Document Preview Icon (small, for chat input)
export const DocumentPreviewSmallIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M11 1H4C3.46957 1 2.96086 1.21071 2.58579 1.58579C2.21071 1.96086 2 2.46957 2 3V17C2 17.5304 2.21071 18.0391 2.58579 18.4142C2.96086 18.7893 3.46957 19 4 19H16C16.5304 19 17.0391 18.7893 17.4142 18.4142C17.7893 18.0391 18 17.5304 18 17V8L11 1Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M11 1V8H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Image Preview Icon (small, for chat input)
export const ImagePreviewSmallIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect x="2" y="2" width="16" height="16" rx="2" stroke={color} strokeWidth="1.5" />
    <Circle cx="6.5" cy="6.5" r="1.5" fill={color} />
    <Path d="M18 13L14 9L4 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Note Preview Icon (small, for chat input)
export const NotePreviewSmallIcon: React.FC<IconProps> = ({ size = 20, color = '#6B7280' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect x="3" y="2" width="14" height="16" rx="2" stroke={color} strokeWidth="1.5" />
    <Path d="M6 6H14M6 10H14M6 14H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

// Folder Icon for selection
export const FolderSelectIcon: React.FC<IconProps & { folderColor?: string }> = ({ size = 24, folderColor = '#F97316' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
      fill={folderColor}
    />
  </Svg>
);

// Regenerate / retry — circular refresh arrow (chat message action)
export const RegenerateIcon: React.FC<IconProps> = ({ size = 24, color = '#1C1C1C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12C4 7.58172 7.58172 4 12 4C15.0736 4 17.7401 5.73398 19.0768 8.28067M20 12C20 16.4183 16.4183 20 12 20C8.92638 20 6.25989 18.266 4.92316 15.7193"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <Path d="M19 5V8.5H15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 19V15.5H8.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
