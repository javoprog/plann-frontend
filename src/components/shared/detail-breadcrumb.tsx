import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
  href: string;
  label: string;
}

export function DetailBreadcrumb({
  root,
  currentLabel,
  parent,
}: {
  root: BreadcrumbEntry;
  currentLabel: string;
  parent?: BreadcrumbEntry;
}) {
  return (
    <Breadcrumb aria-label={root.label}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={root.href} />}>
            {root.label}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {parent && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="max-w-48 truncate"
                render={<Link href={parent.href} />}
              >
                {parent.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem>
          <BreadcrumbPage className="max-w-64 truncate">
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
