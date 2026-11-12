"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Logout.
 *
 * It posts to the logout endpoint and returns the visitor to the gate. The
 * button is disabled while the request is in flight so a double click cannot
 * fire it twice.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="cursor-pointer text-xs tracking-[0.18em] text-blush-200/40 uppercase transition-colors duration-300 hover:text-blush-200 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}
