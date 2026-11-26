    const catalogReady = (workspaces, sessions) => workspaces?.phase === 'ready' &&
      workspaces.state !== 'error' && Array.isArray(workspaces.items) &&
      workspaces.items.every(item => item && typeof item.workspaceId === 'string' && item.workspaceId.length > 0 &&
        Array.isArray(item.sessionIds) && item.sessionIds.every(id => typeof id === 'string' && id.length > 0)) &&
      sessions?.phase === 'ready' && Array.isArray(sessions.ids) &&
      !!sessions.byId && typeof sessions.byId === 'object' && !Array.isArray(sessions.byId) &&
      sessions.ids.every(id => typeof id === 'string' && id.length > 0 &&
        (!Object.hasOwn(sessions.byId, id) || !!sessions.byId[id] &&
          typeof sessions.byId[id] === 'object' && !Array.isArray(sessions.byId[id])))

    // Both surfaces use DSH's authorized catalog, never local retained-only rows.
    function conversationInventory(workspaces, sessions, scope) {
      const admitted = new Set(sessions.ids)
      const owners = new Map()
      for (const workspace of workspaces.items) {
        for (const id of workspace.sessionIds) {
          const existing = owners.get(id)
          owners.set(id, existing === undefined || existing === workspace ? workspace : null)
        }
      }
      const selected = scope ? new Set(scope.sessionIds) : null
      const rows = []
      let unknown = 0
      for (const [id, owner] of owners) {
        if (selected && !selected.has(id)) continue
        if (!owner || !admitted.has(id) || !Object.hasOwn(sessions.byId, id)) { unknown++; continue }
        const row = sessions.byId[id]
        if (row.id !== id || row.origin === 'subagent' || row.blank === true) continue
        const projection = sessions.projectionsBySession?.[id]?.values
        const lastPrompt = projection?.sessionListMetadata?.lastPromptAt ?? row.projectionValues?.sessionListMetadata?.lastPromptAt
        // Only the already-authorized Session list's projection metadata may
        // supplement a missing summary title. Never fetch logs to index titles.
        const projectedTitle = projection?.title ?? row.projectionValues?.title
        const searchTitle = typeof row.title === 'string' && row.title.trim()
          ? row.title : typeof projectedTitle === 'string' && projectedTitle.trim() ? projectedTitle : undefined
        rows.push({ id, row, owner, lastPrompt, searchTitle, legacyDirectChat: projection?.agentPreset === 'abinadwan-direct-chat' ||
          row.agentPreset === 'abinadwan-direct-chat' })
      }
      return { rows, unknown }
    }

