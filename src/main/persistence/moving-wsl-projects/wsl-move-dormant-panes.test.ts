import { describe, expect, it } from 'vitest'
import type { WorkspaceSessionState } from '../../../shared/workspace-session-state-types'
import { deriveHeadlessLegacyTerminalLeafId } from '../../runtime/mobile-session-layout-projection'
import { listWslMoveDormantPanes, withWslMoveDormantPanes } from './wsl-move-dormant-panes'

const LEAF_A = '11111111-1111-4111-8111-111111111111'
const LEAF_B = '22222222-2222-4222-8222-222222222222'

const tab = (id: string, ptyId: string | null) => ({
  id,
  ptyId,
  worktreeId: 'wt',
  title: id,
  customTitle: null,
  color: null,
  sortOrder: 0,
  createdAt: 1
})

function session(): Pick<WorkspaceSessionState, 'tabsByWorktree' | 'terminalLayoutsByTabId'> {
  return {
    tabsByWorktree: {
      wt: [tab('split', 'tab-level-id'), tab('legacy', 'legacy-session')],
      other: [tab('elsewhere', 'other-session')]
    },
    terminalLayoutsByTabId: {
      split: {
        root: {
          type: 'split',
          direction: 'vertical',
          first: { type: 'leaf', leafId: LEAF_A },
          second: { type: 'leaf', leafId: LEAF_B }
        },
        activeLeafId: LEAF_A,
        expandedLeafId: null,
        // A slept pane keeps its session binding; the sibling that never started has none.
        ptyIdsByLeafId: { [LEAF_A]: 'slept-session' }
      }
    }
  }
}

describe('listWslMoveDormantPanes', () => {
  it("lists each in-scope pane that still names its daemon session, and only the scope's", () => {
    expect(listWslMoveDormantPanes(session(), ['wt'])).toEqual([
      { paneKey: `split:${LEAF_A}`, sessionId: 'slept-session', wslDistro: null },
      {
        paneKey: `legacy:${deriveHeadlessLegacyTerminalLeafId('legacy')}`,
        sessionId: 'legacy-session',
        wslDistro: null
      }
    ])
  })

  it("never gives a split's tab-level id to a leaf", () => {
    const panes = listWslMoveDormantPanes(session(), ['wt'])
    expect(panes.map((pane) => pane.sessionId)).not.toContain('tab-level-id')
  })
})

describe('withWslMoveDormantPanes', () => {
  it('keeps the live pane and adds only dormant panes no live pane names', () => {
    const live = [{ paneKey: `split:${LEAF_A}`, sessionId: 'live', wslDistro: 'Ubuntu' }]
    const dormant = [
      { paneKey: `split:${LEAF_A}`, sessionId: 'slept-session', wslDistro: null },
      { paneKey: `split:${LEAF_B}`, sessionId: 'live', wslDistro: null },
      { paneKey: `other:${LEAF_A}`, sessionId: 'pre-slept', wslDistro: null }
    ]
    expect(withWslMoveDormantPanes(live, dormant)).toEqual([
      ...live,
      { paneKey: `other:${LEAF_A}`, sessionId: 'pre-slept', wslDistro: null }
    ])
  })
})
