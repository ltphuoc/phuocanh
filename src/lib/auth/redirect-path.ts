export const normalizeAuthRedirectPath = (
  candidatePath: string | null | undefined,
  fallbackPath: string,
): string => {
  if (!candidatePath) {
    return fallbackPath;
  }

  if (!candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return fallbackPath;
  }

  if (candidatePath.includes("\\")) {
    return fallbackPath;
  }

  try {
    const normalizedUrl = new URL(candidatePath, "https://internal.local");
    if (normalizedUrl.origin !== "https://internal.local") {
      return fallbackPath;
    }

    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return fallbackPath;
  }
};
