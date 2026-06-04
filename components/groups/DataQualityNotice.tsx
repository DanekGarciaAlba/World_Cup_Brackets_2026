import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DataQualityNoticeProps = {
  title: string;
  message: string;
};

export function DataQualityNotice({ title, message }: DataQualityNoticeProps) {
  return (
    <section className="premium-card p-6">
      <AlertTriangle className="mb-4 size-8 text-trophy-gold" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{message}</p>
      <Button asChild variant="secondary" className="mt-5">
        <Link href="/admin/data-quality">Review data quality</Link>
      </Button>
    </section>
  );
}
