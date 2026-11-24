import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/sessionToken";
import { getProfile } from "@/lib/session";
import { ProfileDropdown } from "./ProfileDropdown";

export async function ProfileMenu() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const profile = session ? await getProfile(session.loginId) : null;
  return <ProfileDropdown profile={profile} />;
}
