import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    redirect("/");
  }

  const user = await getUser();

  return (
    <>
      <SettingsClient user={user} />
    </>
  );
}
