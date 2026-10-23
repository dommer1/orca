/**
 * Panes the user had already put to Sleep before the move: no live terminal names them, but the
 * saved session still binds each to its daemon session, whose checkpoint holds the pane's last
 * folder and scrollback. Without them a pre-slept pane reopens empty at its project root.
 */
import { makePaneKey } from '../../../shared/stable-pane-id'
import type { WorkspaceSessionState } from '../../../shared/workspace-session-state-types'
import {
  collectPersistedTerminalLeafIds,
  deriveHeadlessLegacyTerminalLeafId
} from '../../runtime/mobile-session-layout-projection'
import type { WslMoveRestoreHintPane } from './wsl-move-restore-hints'

type DormantSessionSource = Pick<WorkspaceSessionState, 'tabsByWorktree' | 'terminalLayoutsByTabId'>

/** The scope's saved terminal panes that still name a daemon session, one per pane. */
export function listWslMoveDormantPanes(
  session: DormantSessionSource,
  workspaceIds: readonly string[]
): WslMoveRestoreHintPane[] {
  const panes: WslMoveRestoreHintPane[] = []
  for (const workspaceId of new Set(workspaceIds)) {
    for (const tab of session.tabsByWorktree?.[workspaceId] ?? []) {
      const layout = session.terminalLayoutsByTabId?.[tab.id]
      const persisted = collectPersistedTerminalLeafIds(layout)
      // A tab saved with no layout is one pane, the one the session projection names for it.
      const leafIds =
        persisted.length > 0 ? persisted : [deriveHeadlessLegacyTerminalLeafId(tab.id)]
      for (const leafId of leafIds) {
        // A tab's own id belongs to its sole pane; in a split it names no particular leaf.
        const sessionId =
          layout?.ptyIdsByLeafId?.[leafId] ?? (leafIds.length === 1 ? tab.ptyId : null)
        if (sessionId) {
          panes.push({ paneKey: makePaneKey(tab.id, leafId), sessionId, wslDistro: null })
        }
      }
    }
  }
  return panes
}

/** The live panes, plus every dormant pane none of them already names. */
export function withWslMoveDormantPanes(
  live: readonly WslMoveRestoreHintPane[],
  dormant: readonly WslMoveRestoreHintPane[]
): readonly WslMoveRestoreHintPane[] {
  const paneKeys = new Set(live.map((pane) => pane.paneKey))
  const sessionIds = new Set(live.map((pane) => pane.sessionId))
  const added = dormant.filter(
    (pane) => !paneKeys.has(pane.paneKey) && !sessionIds.has(pane.sessionId)
  )
  return added.length === 0 ? live : [...live, ...added]
}
