import { redirect } from "next/navigation";
import { reviewPath } from "@/lib/client/routes";

export function generateStaticParams() {
  return [];
}

export default async function LegacyReviewPage({
  params,
}: {
  params: Promise<{ reviewItemId: string }>;
}) {
  const { reviewItemId } = await params;
  redirect(reviewPath(reviewItemId));
}
