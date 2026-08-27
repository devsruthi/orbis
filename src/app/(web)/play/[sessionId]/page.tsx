import { redirect } from "next/navigation";
import { playPath } from "@/lib/client/routes";

export function generateStaticParams() {
  return [];
}

export default async function LegacyPlayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(playPath(sessionId));
}
