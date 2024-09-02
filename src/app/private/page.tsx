import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function PrivatePage() {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return (
    <div>
      <h1>Private Page</h1>
      <p>Hello {user.email}</p>
      <p>You can only see this page if you are logged in.</p>
    </div>
  );
}
