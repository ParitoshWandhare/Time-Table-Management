import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { ThemeToggle } from "./theme-toggle"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <header className="h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="font-semibold text-base sm:text-lg truncate">BTech Time Table Management</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}