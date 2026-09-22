import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { CompetitionDetails } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

type TabKey = 'about' | 'judging' | 'rules';
const COLLAPSED_LINES = 3;

export function InfoTabs({ content }: { content: CompetitionDetails['content'] }) {
  const { t, pick } = useI18n();
  const [tab, setTab] = useState<TabKey>('about');
  const [expanded, setExpanded] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'about', label: t.tabs.about },
    { key: 'judging', label: t.tabs.judging },
    { key: 'rules', label: t.tabs.rules },
  ];

  // Only offer "View more" when something is actually hidden.
  const hasMore = {
    about: pick(content.about).length > 160,
    judging: content.judgingParameters.length > COLLAPSED_LINES,
    rules: content.rules.length > COLLAPSED_LINES || content.eligibility.length > 0,
  }[tab];

  const select = (key: TabKey) => {
    setTab(key);
    setExpanded(false);
  };

  return (
    <Card>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border }}>
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => select(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingBottom: spacing.md,
                borderBottomWidth: 3,
                borderColor: active ? colors.primaryText : 'transparent',
                marginBottom: -1,
              }}
            >
              <AppText variant="label" weight="semibold" color={active ? colors.primaryText : colors.textMuted} align="center">
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingTop: spacing.lg }}>
        {tab === 'about' ? (
          <AppText variant="body" numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
            {pick(content.about)}
          </AppText>
        ) : tab === 'judging' ? (
          <BulletList
            expanded={expanded}
            items={content.judgingParameters.map((p) => ({
              text: pick(p.title),
              trailing: p.weightPercent != null ? `${p.weightPercent}%` : undefined,
            }))}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" weight="semibold" color={colors.text}>
                {t.rules}
              </AppText>
              <BulletList expanded={expanded} items={content.rules.map((r) => ({ text: pick(r) }))} />
            </View>
            {expanded && content.eligibility.length ? (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="label" weight="semibold" color={colors.text}>
                  {t.eligibility}
                </AppText>
                <BulletList expanded items={content.eligibility.map((r) => ({ text: pick(r) }))} />
              </View>
            ) : null}
          </View>
        )}

        {hasMore ? (
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, marginTop: spacing.md }}
            hitSlop={8}
          >
            <AppText variant="label" weight="medium" color={colors.primaryText}>
              {expanded ? t.viewLess : t.viewMore}
            </AppText>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primaryText} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function BulletList({ items, expanded }: { items: { text: string; trailing?: string }[]; expanded: boolean }) {
  const visible = expanded ? items : items.slice(0, COLLAPSED_LINES);
  return (
    <View style={{ gap: spacing.sm }}>
      {visible.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppText variant="body">•</AppText>
          <AppText variant="body" style={{ flex: 1 }}>
            {item.text}
          </AppText>
          {item.trailing ? (
            <AppText variant="body" weight="semibold" color={colors.primaryText}>
              {item.trailing}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
