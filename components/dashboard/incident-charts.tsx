"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, LabelList } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { IncidentTrend, IncidentDistribution as IncidentDistributionType } from "@/types/dashboard"

const barChartConfig = {
  vehicular: {
    label: "Vehicular",
    color: "#EF4444",
  },
  medical: {
    label: "Medical",
    color: "#3B82F6",
  },
  fire: {
    label: "Fire",
    color: "#F97316",
  },
  other: {
    label: "Other",
    color: "#9333EA",
  },
} satisfies ChartConfig

export function IncidentTrends({ data }: { data: IncidentTrend[] }) {
  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-navy-900">Monthly Incident Trend</CardTitle>
        <CardDescription>January - December 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={barChartConfig} className="min-h-[300px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value: unknown) => (typeof value === 'string' ? value.slice(0, 3) : '')}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="vehicular"
              stackId="a"
              fill="var(--color-vehicular)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="medical"
              stackId="a"
              fill="var(--color-medical)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="fire"
              stackId="a"
              fill="var(--color-fire)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="other"
              stackId="a"
              fill="var(--color-other)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function IncidentDistribution({ data }: { data: IncidentDistributionType[] }) {
  const chartConfig = {
    value: {
      label: "Value",
    },
  } satisfies ChartConfig

  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-navy-900">Incident Distribution</CardTitle>
        <CardDescription>By Emergency Type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="name" hideLabel />}
            />
            <Pie data={data} dataKey="value" nameKey="name">
               <LabelList
                dataKey="name"
                className="fill-foreground"
                stroke="none"
                fontSize={12}
                formatter={(value: unknown) => (typeof value === 'string' ? value.split(' ')[0] : '')}
              />
            </Pie>
            <ChartLegend 
                content={<ChartLegendContent nameKey="name" />} 
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
