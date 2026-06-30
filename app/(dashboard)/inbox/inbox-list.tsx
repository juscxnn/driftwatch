'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { InboxDrift } from '@/lib/types';
import { COPY } from '@/lib/copy';
import { toast } from '@/components/toast';
import { DriftRow } from './drift-row';
import { FilterChips, type ScoreFilter } from './filter-chips';
import { ShortcutsHelpDialog } from './shortcuts-help-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/button';
import { useShortcuts, type ShortcutMap } from './use-shortcuts';
import { triageRunResultAction } from './actions';

export type InboxProject = { id: string; name: string };

export type InboxListProps = {
  initialDrifts: InboxDrift[];
  totalPending: number;
  projects: InboxProject[];
};

const PAGE_SIZE = 50;

export function InboxList({
  initialDrifts,
  totalPending,
  projects,
}: InboxListProps) {
  const [drifts, setDrifts] = useState<InboxDrift[]>(initialDrifts);
  const [score, setScore] = useState<ScoreFilter>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDrifts[0]?.run_result_id ?? null,
  );
  const [rewordId, setRewordId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  // Stash drifts we've optimistically removed so we can restore them on
  // failure. A ref keeps the stash out of the render path and avoids
  // stale-closure problems when two actions race.
  const stashRef = useRef<Map<string, InboxDrift>>(new Map());

  const hasMore = drifts.length < totalPending;

  const filtered = useMemo(() => {
    return drifts.filter((d) => {
      if (projectId !== null && d.project_id !== projectId) return false;
      const s = d.judge_score;
      if (score === 'low' && !(s != null && s < 0.5)) return false;
      if (score === 'mid' && !(s != null && s >= 0.5 && s < THRESHOLD)) return false;
      return true;
    });
  }, [drifts, score, projectId]);

  // Keep selection valid as the list changes.
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && filtered.some((d) => d.run_result_id === selectedId)) {
      return selectedId;
    }
    return filtered[0]?.run_result_id ?? null;
  }, [filtered, selectedId]);

  function moveSelection(delta: 1 | -1) {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const currentIdx = effectiveSelectedId
      ? filtered.findIndex((d) => d.run_result_id === effectiveSelectedId)
      : -1;
    let nextIdx: number;
    if (currentIdx === -1) {
      nextIdx = delta === 1 ? 0 : filtered.length - 1;
    } else {
      nextIdx = (currentIdx + delta + filtered.length) % filtered.length;
    }
    setSelectedId(filtered[nextIdx].run_result_id);
  }

  const handleRemoved = useCallback((runResultId: string) => {
    setDrifts((prev) => {
      const found = prev.find((d) => d.run_result_id === runResultId);
      if (found) stashRef.current.set(runResultId, found);
      return prev.filter((d) => d.run_result_id !== runResultId);
    });
    setSelectedId((current) => (current === runResultId ? null : current));
    setRewordId((current) => (current === runResultId ? null : current));
  }, []);

  const handleActionFailed = useCallback((runResultId: string) => {
    const stashed = stashRef.current.get(runResultId);
    stashRef.current.delete(runResultId);
    if (!stashed) return;
    setDrifts((prev) => {
      if (prev.some((d) => d.run_result_id === runResultId)) return prev;
      return [stashed, ...prev];
    });
    setSelectedId(runResultId);
  }, []);

  async function runTriageDirect(runResultId: string, action: 'approve' | 'accepted') {
    handleRemoved(runResultId);
    const result = await triageRunResultAction(runResultId, action);
    if (!result.ok) {
      handleActionFailed(runResultId);
      const title =
        action === 'approve' ? COPY.inbox.triageErrors.approve : COPY.inbox.triageErrors.escalate;
      toast.error(title, result.error);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const res = await fetch(`/api/inbox?limit=${PAGE_SIZE}&offset=${drifts.length}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as { drifts?: InboxDrift[] };
      const next = body.drifts ?? [];
      setDrifts((prev) => {
        const seen = new Set(prev.map((d) => d.run_result_id));
        const additions = next.filter((d) => !seen.has(d.run_result_id));
        return [...prev, ...additions];
      });
    } catch (err) {
      setMoreError(err instanceof Error ? err.message : 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  }

  const shortcuts = useMemo<ShortcutMap>(() => {
    const map: ShortcutMap = {
      ArrowDown: () => moveSelection(1),
      ArrowUp: () => moveSelection(-1),
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      '?': () => setHelpOpen((v) => !v),
    };
    if (effectiveSelectedId) {
      map.a = () => {
        void runTriageDirect(effectiveSelectedId, 'approve');
      };
      map.r = () => setRewordId(effectiveSelectedId);
      map.e = () => {
        void runTriageDirect(effectiveSelectedId, 'accepted');
      };
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedId, filtered.length]);

  useShortcuts(shortcuts, { enabled: !helpOpen && rewordId === null });

  return (
    <div className="space-y-4">
      <FilterChips
        score={score}
        onScoreChange={setScore}
        projectId={projectId}
        onProjectChange={setProjectId}
        projects={projects}
        onClear={() => {
          setScore('all');
          setProjectId(null);
        }}
      />

      {filtered.length === 0 ? (
        drifts.length === 0 ? null : (
          <EmptyState
            title={COPY.inbox.filters.noMatchesTitle}
            body={COPY.inbox.filters.noMatchesBody}
            action={
              <button
                type="button"
                onClick={() => {
                  setScore('all');
                  setProjectId(null);
                }}
                className="btn-secondary"
              >
                {COPY.inbox.filters.clearFilter}
              </button>
            }
          />
        )
      ) : (
        <ul className="space-y-3">
          {filtered.map((d) => (
            <li key={d.run_result_id}>
              <DriftRow
                drift={d}
                selected={effectiveSelectedId === d.run_result_id}
                rewordMode={rewordId === d.run_result_id}
                onRewordClick={(id) => setRewordId(id || null)}
                onRemoved={handleRemoved}
                onActionFailed={handleActionFailed}
              />
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => void handleLoadMore()}
            loading={loadingMore}
          >
            {loadingMore ? COPY.inbox.loadingMore : COPY.inbox.loadMore}
          </Button>
          {moreError ? <p className="error-text">{moreError}</p> : null}
        </div>
      ) : null}

      <ShortcutsHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

const THRESHOLD = 0.7;