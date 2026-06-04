import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="data-[slot=card]:*:from-primary/5 data-[slot=card]:*:to-card dark:data-[slot=card]:*:bg-white grid grid-cols-1 gap-4 px-4 data-[slot=card]:*:bg-linear-to-t data-[slot=card]:*:shadow-2xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-[1.5rem] leading-[1.2] font-semibold tabular-nums @[250px]/card:text-[1.875rem] leading-[1.2]">
            $1,250.00
          </CardTitle>
          <div>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[0.875rem] leading-[1.2]">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-[#485478]">
            Visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <CardTitle className="text-[1.5rem] leading-[1.2] font-semibold tabular-nums @[250px]/card:text-[1.875rem] leading-[1.2]">
            1,234
          </CardTitle>
          <div>
            <Badge variant="outline">
              <IconTrendingDown />
              -20%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[0.875rem] leading-[1.2]">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Down 20% this period <IconTrendingDown className="size-4" />
          </div>
          <div className="text-[#485478]">
            Acquisition needs attention
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Accounts</CardDescription>
          <CardTitle className="text-[1.5rem] leading-[1.2] font-semibold tabular-nums @[250px]/card:text-[1.875rem] leading-[1.2]">
            45,678
          </CardTitle>
          <div>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[0.875rem] leading-[1.2]">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention <IconTrendingUp className="size-4" />
          </div>
          <div className="text-[#485478]">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      {/* <Card className="@container/card">
        <CardHeader>
          <CardDescription>Growth Rate</CardDescription>
          <CardTitle className="text-[1.5rem] leading-[1.2] font-semibold tabular-nums @[250px]/card:text-[1.875rem] leading-[1.2]">
            4.5%
          </CardTitle>
          <div>
            <Badge variant="outline">
              <IconTrendingUp />
              +4.5%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[0.875rem] leading-[1.2]">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady performance increase <IconTrendingUp className="size-4" />
          </div>
          <div className="text-[#485478]">Meets growth projections</div>
        </CardFooter>
      </Card> */}
    </div>
  )
}
