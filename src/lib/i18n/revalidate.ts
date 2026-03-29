import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { toLocalizedPathname } from "@/lib/i18n/pathname";

export const revalidateLocalizedPath = (pathname: string): void => {
  routing.locales.forEach((locale) => {
    revalidatePath(toLocalizedPathname(locale, pathname));
  });
};
