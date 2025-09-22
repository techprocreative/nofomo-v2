"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("dashboard")

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        <Dashboard activeView={activeView} onViewChange={setActiveView} />
      </main>
    </div>
  )
}
