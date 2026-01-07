
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    redirect("/");
  }

  const user = await getUser();
  return <DashboardClient user={user} />;
}
