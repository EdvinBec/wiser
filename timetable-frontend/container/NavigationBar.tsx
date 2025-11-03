import { Tag } from "@/components/Tag";
import Link from "next/link";

type Props = {
  className?: string;
};

const NavigationBar = ({ className }: Props) => {
  return (
    <nav
      className={`w-full border-b border-gray-200 flex flex-col md:flex-row gap-4 md:gap-0 items-center justify-between py-6 ${className}`}
    >
      <Link href="/" className="flex items-end gap-3">
        <h1 className="text-2xl font-semibold leading-none">Urnik</h1>
        <p className="text-xs text-nowrap">RIT 2 VS</p>
      </Link>

      <div className="flex gap-2 items-center justify-center flex-wrap">
        <Tag variant="lecture" />
        <Tag variant="compExercise" />
        <Tag variant="labExcercise" />
        <Tag variant="seminarExcercise" />
      </div>
    </nav>
  );
};

export default NavigationBar;
