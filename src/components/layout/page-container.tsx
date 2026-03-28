import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageContainerSize = "full" | "immersive" | "lg" | "md" | "reading" | "sm" | "xl";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly size?: PageContainerSize;
}

const getPageContainerSizeClass = (size: PageContainerSize): string => {
  switch (size) {
    case "reading":
      return "max-w-[760px]";
    case "sm":
      return "max-w-xl";
    case "md":
      return "max-w-3xl";
    case "lg":
      return "max-w-5xl";
    case "full":
      return "max-w-none";
    case "immersive":
      return "max-w-[1320px]";
    case "xl":
    default:
      return "max-w-[1180px]";
  }
};

export const PageContainer = ({
  children,
  className,
  size = "xl",
  ...props
}: PageContainerProps): ReactElement => (
  <div
    className={cn(
      "mx-auto w-full px-5 md:px-7 lg:px-10",
      getPageContainerSizeClass(size),
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
