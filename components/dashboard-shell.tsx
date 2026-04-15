"use client"

import dynamic from "next/dynamic"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"


const AppSidebar = dynamic(
  () => import("@/components/app-sidebar").then((module) => module.AppSidebar),
  { ssr: false }
)

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
