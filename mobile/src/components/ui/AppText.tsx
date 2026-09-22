import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'caption' | 'amount';
type Weight = keyof typeof fonts;

const variants: Record<Variant, TextStyle> = {
  title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.semibold, color: colors.text },
  heading: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold, color: colors.text },
  subheading: { fontSize: 15, lineHeight: 20, fontFamily: fonts.medium, color: colors.text },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fonts.regular, color: colors.textMuted },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: colors.textMuted },
  amount: { fontSize: 30, lineHeight: 36, fontFamily: fonts.semibold, color: colors.primaryText },
};

type Props = TextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
};

/** The only text component in the app, so typography stays consistent. */
export function AppText({ variant = 'body', weight, color, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        variants[variant],
        weight && { fontFamily: fonts[weight] },
        color !== undefined && { color },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
