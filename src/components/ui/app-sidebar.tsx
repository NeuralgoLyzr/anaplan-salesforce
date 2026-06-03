"use client"

import * as React from "react"
import {
    IconBuildingBank,
    IconDashboard,
    IconTerminal2,
    IconRobot,
    IconFileText,
    IconCoin,
    IconShieldExclamation,
    IconReceipt,
    IconAdjustments,
} from "@tabler/icons-react"

import { NavMain } from "@/components/ui/nav-main"
import { NavUser } from "@/components/ui/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar"
import Link from "next/link"

// Pared-down navigation for the Revenue Recognition app.
// (Other sections — Dashboard, Analytics, Console, Pipeline, Journeys,
// Tools & Config, User Management, Settings — are intentionally hidden from
// the UI; their components remain on disk for reuse.)
const data = {
    user: {
        name: "Revenue Controller",
        email: "controller@lyzr.ai",
        avatar: "/avatars/shadcn.jpg",
    },
    navTop: [
        { title: "Dashboard",     url: "/dashboard",     icon: IconDashboard     },
        { title: "Agent Console", url: "/console",       icon: IconTerminal2     },
        { title: "Customers",     url: "/customers",     icon: IconBuildingBank  },
        { title: "Configuration", url: "/agents/config", icon: IconAdjustments   },
    ],
    navAgents: [
        {
            title: "Agents",
            url: "/agents",
            icon: IconRobot,
            defaultOpen: true,
            subItems: [
                { title: "Reader Agent",  url: "/agents/reader",  icon: IconFileText          },
                { title: "Pricing Agent", url: "/agents/pricing", icon: IconCoin              },
                { title: "Anomaly Agent", url: "/agents/anomaly", icon: IconShieldExclamation },
                { title: "Billing Agent", url: "/agents/bills",   icon: IconReceipt           },
            ],
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <Link href="/dashboard" className="flex flex-col items-start gap-1 px-3 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/Anaplan_logo.svg.png"
                        alt="Anaplan"
                        className="h-6 w-auto object-contain"
                    />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Revenue Recognition
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navTop} />
                <NavMain items={data.navAgents} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
