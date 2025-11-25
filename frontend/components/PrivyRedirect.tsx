"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname, useRouter } from "next/navigation";

export function PrivyRedirect() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && authenticated && pathname === "/") {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router, pathname]);

  return null;
}
