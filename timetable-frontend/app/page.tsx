import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Tag } from "@/components/Tag";
import NavigationBar from "@/container/NavigationBar";
import Link from "next/link";

export default function Home() {
  return (
    <MaxWidthWrapper>
      <NavigationBar />
    </MaxWidthWrapper>
  );
}
