import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="link"
      size="sm"
      className="px-0"
      render={<Link href={href} />}
    >
      {label}
      <ArrowRight />
    </Button>
  );
}
