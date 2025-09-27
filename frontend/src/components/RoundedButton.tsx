import { type LucideIcon } from "lucide-react";

export interface RoundedButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
}

export function RoundedButton({ icon: Icon, onClick }: RoundedButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full border border-border hover:bg-muted"
    >
      <Icon />
    </button>
  );
}
