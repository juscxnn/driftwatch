'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/field';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toast';
import { TrashIcon } from '@/components/icons';
import {
  renameOrgAction,
  saveLlmKeyAction,
  removeLlmKeyAction,
  deleteOrgAction,
} from '@/lib/actions/org';
import { formatRelative } from '@/lib/format';

type Member = {
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  email: string | null;
};

type SettingsClientProps = {
  /** Used to scope a future "API tokens" section; kept here so the page
   * server component doesn't need to remember to pass it when that lands. */
  orgId: string;
  orgName: string;
  hasStoredKey: boolean;
  llmKeyHint: string | null;
  llmKeySetAt: string | null;
  members: Member[];
  currentUserId: string;
  currentUserRole: 'owner' | 'member';
};

export function SettingsClient({
  orgId: _orgId,
  orgName,
  hasStoredKey,
  llmKeyHint,
  llmKeySetAt,
  members,
  currentUserId,
  currentUserRole,
}: SettingsClientProps) {
  const router = useRouter();

  // === Org name ===
  const [name, setName] = useState(orgName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, startNameTransition] = useTransition();
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setName(orgName);
  }, [orgName]);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError('Organization name cannot be empty.');
      return;
    }
    if (trimmed === orgName) {
      setNameError('No changes to save.');
      return;
    }
    const fd = new FormData();
    fd.set('orgName', trimmed);
    startNameTransition(async () => {
      const res = await renameOrgAction(fd);
      if (!res.ok) {
        setNameError(res.error);
        return;
      }
      setNameSaved(true);
      setName(trimmed);
      toast.success('Organization renamed');
      router.refresh();
      window.setTimeout(() => setNameSaved(false), 1500);
    });
  }

  // === LLM key ===
  const [key, setKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyPending, startKeyTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [keySaved, setKeySaved] = useState(false);

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setKeyError(null);
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      setKeyError('Paste an API key to save.');
      return;
    }
    const fd = new FormData();
    fd.set('apiKey', trimmed);
    startKeyTransition(async () => {
      const res = await saveLlmKeyAction(fd);
      if (!res.ok) {
        setKeyError(res.error);
        return;
      }
      setKey('');
      setKeySaved(true);
      toast.success('Encrypted key saved');
      router.refresh();
      window.setTimeout(() => setKeySaved(false), 1500);
    });
  }

  function handleRemoveKey() {
    setKeyError(null);
    startRemoveTransition(async () => {
      const res = await removeLlmKeyAction();
      if (!res.ok) {
        setKeyError(res.error);
        return;
      }
      toast.success('LLM key removed');
      router.refresh();
    });
  }

  // === Delete org ===
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDeleteConfirm() {
    setDeleteError(null);
    const fd = new FormData();
    startDeleteTransition(async () => {
      try {
        await deleteOrgAction(fd);
        // The action calls redirect('/login') on success, which throws.
        // Next.js handles the navigation; this line is unreachable.
      } catch (err) {
        // next/navigation redirect throws a sentinel (NEXT_REDIRECT) that
        // Next swallows at the framework layer — but the await re-throws
        // it here. Ignore those; surface anything else as an error.
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('NEXT_REDIRECT')) {
          setDeleteError(msg);
          toast.error('Could not delete organization', msg);
        }
      }
    });
  }

  const isOwner = currentUserRole === 'owner';

  return (
    <div className="space-y-6">
      {/* ============ Org ============ */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-base font-medium tracking-tight">Organization</h2>
          <p className="muted mt-1">
            {isOwner
              ? 'Rename your workspace. Changes apply immediately.'
              : 'You can view your workspace name here.'}
          </p>
        </div>
        <form onSubmit={handleRename} className="space-y-3">
          <Field label="Workspace name" error={nameError}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner || namePending}
              autoComplete="organization"
              maxLength={200}
              aria-invalid={Boolean(nameError)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={namePending}
              success={nameSaved}
              disabled={!isOwner}
            >
              Save name
            </Button>
            {!isOwner ? (
              <span className="subtle">Only owners can rename the workspace.</span>
            ) : null}
          </div>
        </form>
      </section>

      {/* ============ Members ============ */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-medium tracking-tight">Members</h2>
            <p className="muted mt-1">
              {members.length === 1
                ? '1 member in this workspace.'
                : `${members.length} members in this workspace.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" disabled>
              Invite member
            </Button>
            <span className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-text-muted">
              Coming soon
            </span>
          </div>
        </div>

        <div className="-mx-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-2xs uppercase tracking-wide text-text-subtle">
                <th className="px-6 py-2 text-left font-medium">Member</th>
                <th className="px-6 py-2 text-left font-medium">Role</th>
                <th className="px-6 py-2 text-left font-medium">Joined</th>
                <th className="px-6 py-2 text-left font-medium">You</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.user_id === currentUserId;
                return (
                  <tr key={m.user_id} className="border-b border-border last:border-b-0">
                    <td className="px-6 py-2.5">
                      <span className="block truncate text-text">
                        {m.email ?? (
                          <span className="text-text-subtle">
                            {m.user_id.slice(0, 8)}…
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-text-muted">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-text-muted">
                      {formatRelative(m.created_at)}
                    </td>
                    <td className="px-6 py-2.5 text-text-muted">
                      {isSelf ? 'You' : ''}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center muted">
                    No members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ LLM key (BYOK) ============ */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-base font-medium tracking-tight">LLM provider key</h2>
          <p className="muted mt-1">
            Save your own API key for the judge model. We encrypt it with
            the server key and reuse it on every run. The env fallback
            (e.g. <span className="num">DEEPSEEK_API_KEY</span>) wins when
            no key is saved here — but a key saved here always wins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusDot active={hasStoredKey} />
          <span className="text-sm text-text">
            {hasStoredKey ? 'Key configured' : 'No key configured'}
          </span>
          {hasStoredKey && llmKeyHint ? (
            <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-text-muted num">
              {llmKeyHint}
            </span>
          ) : null}
        </div>

        {hasStoredKey && llmKeySetAt ? (
          <p className="subtle">
            Last updated {formatRelative(llmKeySetAt)}
          </p>
        ) : null}

        <form onSubmit={handleSaveKey} className="space-y-3">
          <Field
            label={hasStoredKey ? 'Replace API key' : 'API key'}
            helper="We store this encrypted at rest. Anyone with the encrypted key and your server key can read it — rotate it from your provider if it leaks."
            error={keyError}
          >
            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              disabled={keyPending || removePending}
              aria-invalid={Boolean(keyError)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              loading={keyPending}
              success={keySaved}
            >
              {hasStoredKey ? 'Replace key' : 'Save key'}
            </Button>
            {hasStoredKey ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemoveKey}
                loading={removePending}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      {/* ============ Danger zone ============ */}
      <section className="card space-y-4 border-danger/40">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-danger/40 bg-danger-muted text-danger"
          >
            <TrashIcon />
          </span>
          <div>
            <h2 className="text-base font-medium tracking-tight text-danger">
              Danger zone
            </h2>
            <p className="muted mt-1">
              Deleting your organization removes every project, run, and
              golden Q&amp;A in this workspace. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-danger/30 pt-4">
          <p className="subtle">
            {isOwner
              ? 'You will need to type your workspace name to confirm.'
              : 'Only workspace owners can delete the organization.'}
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            disabled={!isOwner}
          >
            Delete organization
          </Button>
        </div>
        {deleteError ? <p className="error-text">{deleteError}</p> : null}
      </section>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          if (deletePending) return;
          setDeleteOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete organization?"
        description="This permanently deletes your organization, all projects, and every golden Q&A. This action cannot be undone."
        confirmLabel="Delete organization"
        cancelLabel="Cancel"
        variant="danger"
        loading={deletePending}
        requireTextMatch={orgName}
        requireTextLabel={`Type the workspace name (${orgName}) to confirm:`}
      />
    </div>
  );
}

/** Small status indicator — green when key is present, muted otherwise. */
function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${
        active ? 'bg-success' : 'bg-text-subtle'
      }`}
    />
  );
}


