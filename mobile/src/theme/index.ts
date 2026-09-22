/** Design tokens sampled from the Feedants design. Components never hard-code colours. */
export const colors = {
  primary: '#0F5D63', // CTA buttons, active language pill
  primaryText: '#0E6D6F', // teal text: dates, amounts, links
  primaryTint: '#E6F2F1', // countdown / disclaimer banners
  primaryTintBorder: '#CFE4E2',
  referralTint: '#E3F4EC',

  text: '#1A2427',
  textMuted: '#6A7479',
  textSubtle: '#8E979B',
  onPrimary: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F5', // chips, inactive toggle
  border: '#E5EAEB',
  divider: '#EDF1F2',
  track: '#DDE8E8', // progress bar background

  gold: '#F2A900',
  silver: '#A7B0B6',
  bronze: '#E3772F',
  warning: '#B26A00',
  warningTint: '#FFF4E0',
  danger: '#C0392B',
  dangerTint: '#FDECEA',
  success: '#1E8E5A',
} as const;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const shadow = {
  shadowColor: '#0B3A3D',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
