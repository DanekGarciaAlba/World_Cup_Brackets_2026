import { toast } from "sonner";

export function showRankJumpToast(name: string, rank: number) {
  toast.success(`${name} moved to rank ${rank}`, {
    description: "Leaderboard cache is ready for the next scoring sync.",
  });
}
