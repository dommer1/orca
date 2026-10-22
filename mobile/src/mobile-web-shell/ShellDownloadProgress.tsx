import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors, radii } from '../theme/mobile-theme'
import { slideTransition } from '../components/ui/transition-styles'
import { useHostDisplay, type HostDisplaySource } from '../transport/use-host-display'
import type { MobileWebShellSessionState } from './mobile-web-shell-session-contract'
import { ShellWaitingFrame } from './ShellWaitingFrame'

const DOWNLOADING_LABEL = 'Updating workspace'

function megabytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1)
}

/** The page bundle coming down from the desktop, as a bar over the bytes received. */
export function ShellDownloadProgress({
  state,
  host
}: {
  state: Extract<MobileWebShellSessionState, { kind: 'fetching' }>
  /** Null until the stored profile is read, which leaves the caption without a name. */
  host: HostDisplaySource | null
}) {
  const sized = state.totalBytes > 0
  const fraction = sized ? Math.min(1, state.receivedBytes / state.totalBytes) : 0
  const hostTitle = useHostDisplay(host).title
  const source = host === null ? '' : `from ${hostTitle} · `
  const amount = sized
    ? `${megabytes(state.receivedBytes)} of ${megabytes(state.totalBytes)} MB`
    : `${megabytes(state.receivedBytes)} MB`
  return (
    <ShellWaitingFrame
      label={DOWNLOADING_LABEL}
      indicator={
        sized ? (
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel={DOWNLOADING_LABEL}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
            testID="mobile-web-shell-progress-bar"
          >
            <View style={[styles.fill, { width: `${fraction * 100}%` }, slideTransition]} />
          </View>
        ) : (
          // No size to measure against: a spinner rather than a bar that never moves.
          <ActivityIndicator
            color={colors.textSecondary}
            accessibilityLabel={DOWNLOADING_LABEL}
            testID="mobile-web-shell-progress-bar"
          />
        )
      }
      caption={`${source}${amount}`}
    />
  )
}

const styles = StyleSheet.create({
  track: {
    width: 200,
    height: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.fill
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary
  }
})
