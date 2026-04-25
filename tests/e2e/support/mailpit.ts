import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { E2E_BASE_URL, inbucketBaseUrl } from "./runtime";

const mailpitAddressSchema = z.object({
  Address: z.string(),
  Name: z.string(),
});

const mailpitMessageSummarySchema = z.object({
  Created: z.string(),
  ID: z.string(),
  To: z.array(mailpitAddressSchema),
});

const mailpitSearchResponseSchema = z.object({
  messages: z.array(mailpitMessageSummarySchema),
});

const mailpitMessageDetailSchema = z.object({
  HTML: z.string(),
  Text: z.string(),
});

type MailpitMessageDetail = z.infer<typeof mailpitMessageDetailSchema>;

const MAILPIT_API_BASE_URL = `${inbucketBaseUrl}/api/v1`;
const APP_CALLBACK_MAGIC_LINK_PATTERN = /https?:\/\/[^\s)"'<>]+\/auth\/callback\?[^\s)"'<>]+/;
const SUPABASE_MAGIC_LINK_PATTERN = /https?:\/\/[^\s)"'<>]+\/auth\/v1\/verify\?[^\s)"'<>]+/;
const MAGIC_LINK_CODE_PATTERN = /Alternatively, enter the code: (\d+)/;

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MAILPIT_REQUEST_FAILED:${response.status}`);
  }

  return response.json();
};

const normalizeAppCallbackUrl = (callbackUrl: URL): URL => {
  const canonicalBaseUrl = new URL(E2E_BASE_URL);
  callbackUrl.host = canonicalBaseUrl.host;
  callbackUrl.protocol = canonicalBaseUrl.protocol;

  return callbackUrl;
};

const normalizeMagicLinkUrl = (rawUrl: string): string => {
  const decodedUrl = rawUrl
    .replaceAll("&amp;", "&")
    .replaceAll("=3D", "=")
    .replaceAll(/=\r?\n/g, "");

  const magicLinkUrl = new URL(decodedUrl);
  const redirectTo = magicLinkUrl.searchParams.get("redirect_to");
  if (!redirectTo) {
    if (magicLinkUrl.pathname === "/auth/callback") {
      normalizeAppCallbackUrl(magicLinkUrl);
    }

    return magicLinkUrl.toString();
  }

  const redirectUrl = new URL(redirectTo);
  normalizeAppCallbackUrl(redirectUrl);
  magicLinkUrl.searchParams.set("redirect_to", redirectUrl.toString());

  return magicLinkUrl.toString();
};

const findMagicLinkUrl = (content: string): string | null => {
  const appCallbackMatch = content.match(APP_CALLBACK_MAGIC_LINK_PATTERN);
  if (appCallbackMatch?.[0]) {
    return normalizeMagicLinkUrl(appCallbackMatch[0]);
  }

  const supabaseMatch = content.match(SUPABASE_MAGIC_LINK_PATTERN);
  if (supabaseMatch?.[0]) {
    return normalizeMagicLinkUrl(supabaseMatch[0]);
  }

  return null;
};

const extractMagicLinkUrl = (detail: MailpitMessageDetail): string | null => {
  const textMatch = findMagicLinkUrl(detail.Text);
  if (textMatch) {
    return textMatch;
  }

  const htmlMatch = findMagicLinkUrl(detail.HTML);
  if (htmlMatch) {
    return htmlMatch;
  }

  return null;
};

const extractMagicLinkCode = (detail: MailpitMessageDetail): string | null => {
  const textMatch = detail.Text.match(MAGIC_LINK_CODE_PATTERN);
  if (textMatch?.[1]) {
    return textMatch[1];
  }

  const htmlMatch = detail.HTML.match(MAGIC_LINK_CODE_PATTERN);
  if (htmlMatch?.[1]) {
    return htmlMatch[1];
  }

  return null;
};

const findLatestMessageId = async (email: string): Promise<string | null> => {
  const searchResult = mailpitSearchResponseSchema.parse(await fetchJson(
    `${MAILPIT_API_BASE_URL}/search?query=${encodeURIComponent(email)}`,
  ));
  const matchingMessages = [...searchResult.messages]
    .filter((message) => message.To.some((recipient) => recipient.Address === email))
    .sort((left, right) => right.Created.localeCompare(left.Created));

  return matchingMessages[0]?.ID ?? null;
};

export const waitForMagicLinkUrl = async (
  email: string,
  timeoutMs = 30_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messageId = await findLatestMessageId(email);
    if (messageId) {
      const detail = mailpitMessageDetailSchema.parse(await fetchJson(
        `${MAILPIT_API_BASE_URL}/message/${messageId}`,
      ));
      const magicLinkUrl = extractMagicLinkUrl(detail);
      if (magicLinkUrl) {
        return magicLinkUrl;
      }
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for magic link email for ${email}.`);
};

export const waitForMagicLinkCode = async (
  email: string,
  timeoutMs = 30_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messageId = await findLatestMessageId(email);
    if (messageId) {
      const detail = mailpitMessageDetailSchema.parse(await fetchJson(
        `${MAILPIT_API_BASE_URL}/message/${messageId}`,
      ));
      const magicLinkCode = extractMagicLinkCode(detail);
      if (magicLinkCode) {
        return magicLinkCode;
      }
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for magic link code for ${email}.`);
};
