import Link from "next/link";

type TopBarProps = {
  title: string;
  backHref?: string;
  rightHref?: string;
  rightIcon?: string;
};

export default function TopBar({
  title,
  backHref,
  rightHref,
  rightIcon,
}: TopBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
      <div className="w-8">
        {backHref && (
          <Link href={backHref} className="text-sm text-primary">
            ‹ 뒤로
          </Link>
        )}
      </div>
      <h1 className="text-[17px] font-semibold">{title}</h1>
      <div className="w-8 text-right">
        {rightHref && rightIcon && (
          <Link href={rightHref} className="text-lg">
            {rightIcon}
          </Link>
        )}
      </div>
    </div>
  );
}
