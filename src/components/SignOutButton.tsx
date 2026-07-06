"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="microlabel cursor-pointer hover:text-(--color-ink)"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.replace("/studio/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
