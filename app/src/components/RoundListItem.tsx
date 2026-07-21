import Link from "next/link";

type RoundListItemProps = {
  href: string;
  title: string;
  sub?: string;
  value: string;
};

export default function RoundListItem({
  href,
  title,
  sub,
  value,
}: RoundListItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg bg-card-bg px-3.5 py-3"
    >
      <div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </Link>
  );
}
