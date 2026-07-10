import { useThemeStore } from '../store/themeStore';
import { themes } from './themes';

// Resolved once, at the moment this module is first evaluated. Screens reached only through
// AppDrawer (the post-login app) are deliberately NOT imported until RootNavigator's gating
// confirms the society's theme has already been resolved (see RootNavigator.tsx) — so by the
// time any of those screens' module-level StyleSheet.create() calls run, useThemeStore already
// holds the right theme. Pre-login (AuthStack) screens are imported eagerly and always see the
// default theme here, which is correct since no society is known yet at that point.
export const colors = themes[useThemeStore.getState().themeId] ?? themes.ocean;
