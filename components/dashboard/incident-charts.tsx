"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IncidentTrend, IncidentDistribution as IncidentDistributionType } from "@/types/dashboard"

// Unified color configuration with PRECISE hex codes provided by the user
const chartConfig = {
  vehicular: {
    label: "Vehicular Collision",
    color: "#15286A",
  },
  medical: {
    label: "Medical Emergency",
    color: "#A80107",
  },
  structural: {
    label: "Structural Failure",
    color: "#E77F00",
  },
  fire: {
    label: "Fire / Explosion",
    color: "#0F4503",
  },
  water: {
    label: "Flood / Water",
    color: "#2803A2",
  },
  unknown: {
    label: "Unknown Cause",
    color: "#9B058C",
  },
} satisfies ChartConfig

export function IncidentTrends({ data }: { data: IncidentTrend[] }) {
  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <CardTitle className="text-2xl font-bold text-[#1E293B]">Incident Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-6 pt-0">
        <ChartContainer config={chartConfig} className="h-full w-full min-h-[220px]">
          <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name, item, index, payload) => {
                    const total = Object.keys(chartConfig).reduce((acc, key) => acc + (payload[key] || 0), 0)
                    const percentage = total > 0 ? ((value as number / total) * 100).toFixed(1) : "0.0"
                    return (
                      <div className="flex flex-1 justify-between items-center gap-2 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label || name}</span>
                        </div>
                        <span className="font-mono font-medium text-foreground">
                          {value} <span className="text-[10px] text-muted-foreground">({percentage}%)</span>
                        </span>
                      </div>
                    )
                  }}
                />
              } 
            />
            <Bar
              dataKey="vehicular"
              stackId="a"
              fill="var(--color-vehicular)"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="medical"
              stackId="a"
              fill="var(--color-medical)"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="structural"
              stackId="a"
              fill="var(--color-structural)"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="fire"
              stackId="a"
              fill="var(--color-fire)"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="water"
              stackId="a"
              fill="var(--color-water)"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="unknown"
              stackId="a"
              fill="var(--color-unknown)"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function IncidentDistribution({ 
  data, 
  period = "monthly", 
  onPeriodChange 
}: { 
  data: IncidentDistributionType[], 
  period?: string,
  onPeriodChange?: (value: string) => void
}) {
  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <CardTitle className="text-2xl font-bold text-[#1E293B]">Incident Summary</CardTitle>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[110px] bg-[#F8FAFC] border-[#E2E8F0] h-9 rounded-lg text-sm font-medium">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex items-center justify-between gap-8 p-6">
        <div className="flex flex-col gap-4 w-[35%]">
          {data.map((item, index) => {
            const configKey = Object.keys(chartConfig).find(
              key => chartConfig[key as keyof typeof chartConfig].label === item.name
            ) as keyof typeof chartConfig || 'unknown'
            
            const color = chartConfig[configKey]?.color || "#94A3B8"
            
            return (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded shrink-0" 
                  style={{ backgroundColor: color }} 
                />
                <span className="text-sm font-medium text-[#334155] truncate">{item.name}</span>
              </div>
            )
          })}
        </div>
        <div className="relative w-[65%] flex justify-center h-full items-center">
          <ChartContainer config={chartConfig} className="aspect-square w-full max-h-[280px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius="100%"
                stroke="none"
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const RADIAN = Math.PI / 180;
                  // Position labels slightly further out (70%) for the larger chart
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);

                  if (percent < 0.04) return null;

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[14px] font-black pointer-events-none"
                    >
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {data.map((item, index) => {
                  const configKey = Object.keys(chartConfig).find(
                    key => chartConfig[key as keyof typeof chartConfig].label === item.name
                  ) || 'unknown'
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`var(--color-${configKey})`}
                      className="outline-none"
                    />
                  )
                })}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
