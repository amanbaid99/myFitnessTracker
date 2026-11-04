import Link from "next/link";
import { ClientRecord } from "@/components/coaching/client-record";
import { ScreenHeader } from "@/components/screen-header";
import { getClientSummary } from "@/lib/coaching";
import { createClient } from "@/lib/supabase/server";
import { MASK } from "@/lib/mask";
export default async function Page({
  params,
}: PageProps<"/coaching/[connectionId]">) {
  const { connectionId } = await params;
  const data = await getClientSummary(await createClient(), connectionId);
  return (
    <>
      <Link
        href="/coaching"
        className="mb-2 flex min-h-11 items-center text-sm text-muted-foreground"
      >
        Back to coaching
      </Link>
      {data ? (
        <>
          <div className={MASK}>
            <ScreenHeader
              title={data.client_name}
              subtitle="Shared client record"
            />
          </div>
          <ClientRecord record={data} />
        </>
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          This client record is unavailable. Sharing may have been revoked.
        </p>
      )}
    </>
  );
}
