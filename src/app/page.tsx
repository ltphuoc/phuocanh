import { redirect } from "next/navigation";
import { getAuthGateState } from "@/lib/server/couple-context";

export default async function IndexPage(): Promise<never> {
  const state = await getAuthGateState();

  if (state.status === "unauthenticated") {
    redirect("/login");
  }

  if (state.status === "needs_invite") {
    redirect("/accept-invite");
  }

  redirect("/home");
}
