import { Badge } from "@/components/ui/badge";

export function RankChangeBadge({ label = "Stable" }: { label?: string }) {
  return <Badge variant="secondary">{label}</Badge>;
}
