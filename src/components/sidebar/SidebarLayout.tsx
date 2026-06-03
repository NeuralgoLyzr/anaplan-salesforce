import { AppSidebar } from "@/components/ui/app-sidebar"
import { SiteHeader } from "@/components/ui/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

const SidebarLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 68)",
                    "--header-height": "calc(var(--spacing) * 12)",
                    height: "100svh",
                    overflow: "hidden",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="sidebar" />
            <SidebarInset className="app-bg overflow-y-auto overflow-x-hidden">
                <SiteHeader />
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

export default SidebarLayout
