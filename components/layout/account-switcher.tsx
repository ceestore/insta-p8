"use client"

import { useEffect, useState } from "react"

// Switches the account the dashboard shows. Every page reads the account from localStorage ("ig_user_id"),
// so switching = store the other account and reload. Shown only when two or more accounts are connected.
export function AccountSwitcher({ userId, collapsed }: { userId: string | null; collapsed?: boolean }) {
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([])

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => {})
  }, [])

  if (collapsed || accounts.length < 2) return null

  const change = (id: string) => {
    const next = accounts.find((a) => a.id === id)
    if (!next || next.id === userId) return
    try {
      localStorage.setItem("ig_user_id", next.id)
      localStorage.setItem("ig_username", next.username)
      localStorage.removeItem("ig_profile_pic")
    } catch {}
    window.location.reload()
  }

  return (
    <div className="mb-3 px-1">
      <label htmlFor="account-switcher" className="mb-1 block text-xs text-muted-foreground">
        Conta
      </label>
      <select
        id="account-switcher"
        value={userId || ""}
        onChange={(e) => change(e.target.value)}
        className="h-9 w-full rounded-lg border border-sidebar-border bg-sidebar px-2 text-xs font-medium text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            @{a.username}
          </option>
        ))}
      </select>
    </div>
  )
}
