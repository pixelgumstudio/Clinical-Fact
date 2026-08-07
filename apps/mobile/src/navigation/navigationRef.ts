import { createNavigationContainerRef } from '@react-navigation/native';
import { MainStackParamList } from './MainStackNavigator';

/** Lets code outside the React tree (notification tap handlers, deep links) navigate once
 *  the container has mounted — used by App.tsx's notification response listener. */
export const navigationRef = createNavigationContainerRef<MainStackParamList>();
