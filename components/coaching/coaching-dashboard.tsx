"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { confirmDialog } from "@/components/confirm-dialog";
import { MASK } from "@/lib/mask";
import type { CoachingConnection } from "@/lib/coaching";
import type { Assessment } from "@/lib/feedback-data";
const subscribe = (fn: () => void) => {
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
};
export function CoachingDashboard({
  connections,
  userId,
  assessments,
}: {
  connections: CoachingConnection[];
  userId: string;
  assessments: Assessment[];
}) {
  const router = useRouter();
  const hash = useSyncExternalStore(
      subscribe,
      () =>
        new URLSearchParams(window.location.hash.slice(1)).get("invite") ?? "",
      () => "",
    ),
    [typed, setTyped] = useState<string | null>(null),
    [preview, setPreview] = useState<{
      coach_name: string;
      expires_at: string;
    } | null>(null),
    [share, setShare] = useState(false),
    [consent, setConsent] = useState(false),
    [invite, setInvite] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const token = (typed ?? hash).trim();
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch {
      setMessage(
        "This action could not be completed. The invitation may be expired, already used or unavailable. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    await run(async () => {
      const { data, error } = await createClient().rpc(
        "create_coaching_invite",
      );
      if (error) throw error;
      setInvite(`${window.location.origin}/coaching#invite=${data}`);
      setMessage(
        "Private invitation ready. It expires in 7 days and can be accepted once. Share it only with the intended client.",
      );
    });
  }
  async function review() {
    await run(async () => {
      const { data, error } = await createClient().rpc(
        "coaching_invite_preview",
        { p_token: token },
      );
      if (error) throw error;
      setPreview(data);
      setConsent(false);
      setShare(false);
    });
  }
  async function accept() {
    if (!consent) return;
    await run(async () => {
      const { error } = await createClient().rpc("accept_coaching_invite", {
        p_token: token,
        p_share_measurements: share,
      });
      if (error) throw error;
      setPreview(null);
      setTyped("");
      window.history.replaceState(null, "", "/coaching");
      setMessage("Sharing accepted. You can revoke it below at any time.");
      router.refresh();
    });
  }
  async function revoke(id: string) {
    if (
      !(await confirmDialog({
        title: "Revoke coaching access?",
        message:
          "This stops new access. Information already viewed cannot be recalled. You can reconnect later with a new invitation.",
        confirmLabel: "Revoke access",
        destructive: true,
      }))
    )
      return;
    await run(async () => {
      const { error } = await createClient().rpc("revoke_coaching_connection", {
        p_connection: id,
      });
      if (error) throw error;
      router.refresh();
      setMessage("Access revoked. Future requests are blocked.");
    });
  }
  const clients = connections.filter(
      (c) => c.user_id === userId && !c.revoked_at,
    ),
    coaches = connections.filter(
      (c) => c.client_id === userId && !c.revoked_at,
    );
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Work with a coach</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your own account, then review an invitation code. Sharing
          is off until you accept.
        </p>
        <label className="mt-3 block text-xs">
          Invitation code
          <Input
            value={typed ?? hash}
            onChange={(e) => {
              setTyped(e.target.value);
              setPreview(null);
              setConsent(false);
            }}
            className={MASK}
          />
        </label>
        <Button
          className="mt-2 w-full"
          disabled={busy || token.length !== 64}
          onClick={review}
        >
          Review invitation
        </Button>
        {preview && (
          <div className="mt-4 rounded-xl border p-3">
            <p className={`font-medium ${MASK}`}>
              Connect with {preview.coach_name}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This coach will see your completed app workouts, exercises and
              sets, weekly training summaries and targets, and the observations
              they record for you. Your workout notes and account details stay
              private. Measurements are optional. You can revoke sharing at any
              time.
            </p>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
              />
              Also share my measurement history and latest body weight
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I agree to this sharing
            </label>
            <Button
              className="mt-2 w-full"
              disabled={busy || !consent}
              onClick={accept}
            >
              Accept coaching connection
            </Button>
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Manage clients</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Create a private link for a client. They must sign in and accept
          before you can view their training.
        </p>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          disabled={busy}
          onClick={create}
        >
          Create client invitation
        </Button>
        {invite && (
          <div className="mt-3">
            <label className="text-xs">
              Private invitation link
              <textarea
                readOnly
                value={invite}
                className={`mt-1 w-full rounded-xl border bg-background p-2 text-xs ${MASK}`}
              />
            </label>
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite);
                  setMessage("Invitation copied.");
                } catch {
                  setMessage("Select and copy the invitation link above.");
                }
              }}
            >
              Copy invitation link
            </Button>
          </div>
        )}
        <ul className="mt-2 divide-y">
          {clients.map((c) => (
            <li key={c.id} className="py-3">
              <Link
                href={`/coaching/${c.id}`}
                className={`flex min-h-11 items-center text-sm font-medium text-primary ${MASK}`}
              >
                {c.client_name} · Open client
              </Link>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => revoke(c.id)}
              >
                Revoke client access
              </Button>
            </li>
          ))}
        </ul>
        {!clients.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            No accepted client connections yet.
          </p>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">My coaches</h2>
        {!coaches.length && (
          <p className="mt-2 text-sm text-muted-foreground">
            No coach has access to your records.
          </p>
        )}
        <ul className="divide-y">
          {coaches.map((c) => (
            <li key={c.id} className="py-3">
              <p className={`text-sm font-medium ${MASK}`}>{c.coach_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Workout sharing active. Measurements{" "}
                {c.share_measurements ? "shared" : "private"}.
              </p>
              <Button
                variant="secondary"
                className="mt-2 w-full"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { error } = await createClient().rpc(
                      "set_coaching_sharing",
                      { p_connection: c.id, p_share: !c.share_measurements },
                    );
                    if (error) throw error;
                    router.refresh();
                    setMessage("Measurement sharing updated.");
                  })
                }
              >
                {c.share_measurements
                  ? "Stop sharing measurements"
                  : "Share measurements with this coach"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => revoke(c.id)}
              >
                Revoke this coach&apos;s access
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">My assessment record</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Observations and coach-reviewed training cues, not diagnoses. Archived
          records remain available to you.
        </p>
        <ul className={`mt-2 divide-y ${MASK}`}>
          {assessments.map((a) => (
            <li key={a.id} className="py-3">
              <p className="text-sm font-medium">{a.finding}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.adaptation}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review {a.review_on} · {a.active ? "Active" : "Archived"}
              </p>
              {a.active && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { error } = await createClient().rpc(
                        "archive_coach_assessment",
                        { p_assessment: a.id },
                      );
                      if (error) throw error;
                      router.refresh();
                    })
                  }
                >
                  Archive observation
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p role="status" className="text-sm text-muted-foreground">
        {busy ? "Working…" : message}
      </p>
    </div>
  );
}
