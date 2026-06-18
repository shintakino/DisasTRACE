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
import { ShieldCheck, BarChart2 } from "lucide-react"

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

export function IncidentTrends({ 
  data,
  filter = "this_year",
  onFilterChange
}: { 
  data: IncidentTrend[];
  filter?: string;
  onFilterChange?: (filter: string) => void;
}) {
  const totalIncidents = data.reduce((sum, item) => {
    return sum + (item.vehicular || 0) + (item.medical || 0) + (item.structural || 0) + (item.fire || 0) + (item.water || 0) + (item.unknown || 0);
  }, 0);
  const isEmpty = totalIncidents === 0;

  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <CardTitle className="text-2xl font-bold text-[#1E293B]">Incident Summary</CardTitle>
        <Select value={filter} onValueChange={(val) => onFilterChange?.(val || "")}>
          <SelectTrigger className="w-[120px] bg-[#F8FAFC] border-[#E2E8F0] h-9 rounded-lg text-sm font-medium">
            <SelectValue placeholder="Filter">
              {filter === "today" && "Today"}
              {filter === "this_week" && "This Week"}
              {filter === "this_month" && "This Month"}
              {filter === "this_year" && "This Year"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-6 pt-0 flex flex-col justify-center">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
              <BarChart2 className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-[#64748B] text-sm font-bold">No incident logs recorded</p>
            <p className="text-[#94A3B8] text-xs mt-1">No requests have been verified or logged during this period.</p>
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="h-full w-full min-h-[220px]">
          <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => value}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name, item, index, payload) => {
                    const total = Object.keys(chartConfig).reduce((acc, key) => acc + ((payload as any)[key] || 0), 0)
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
        )}
      </CardContent>
    </Card>
  )
}

export function IncidentDistribution({ 
  data, 
  filter = "this_month", 
  onFilterChange 
}: { 
  data: IncidentDistributionType[], 
  filter?: string,
  onFilterChange?: (value: string) => void
}) {
  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const isEmpty = totalValue === 0;

  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <CardTitle className="text-2xl font-bold text-[#1E293B]">Incident Distribution</CardTitle>
        <Select value={filter} onValueChange={(val) => onFilterChange?.(val || "")}>
          <SelectTrigger className="w-[120px] bg-[#F8FAFC] border-[#E2E8F0] h-9 rounded-lg text-sm font-medium">
            <SelectValue placeholder="Filter">
              {filter === "today" && "Today"}
              {filter === "this_week" && "This Week"}
              {filter === "this_month" && "This Month"}
              {filter === "this_year" && "This Year"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 p-6 overflow-hidden">
        <div className="flex flex-row flex-wrap sm:flex-col gap-3 w-full sm:w-[40%] max-h-[100px] sm:max-h-full overflow-y-auto pr-2 shrink-0">
          {data.map((item, index) => {
            const configKey = Object.keys(chartConfig).find(
              key => chartConfig[key as keyof typeof chartConfig].label === item.name
            ) as keyof typeof chartConfig || 'unknown'
            
            const color = chartConfig[configKey]?.color || "#94A3B8"
            
            return (
              <div key={index} className="flex items-center gap-3 min-w-[120px] sm:min-w-0">
                <div 
                  className="w-4 h-4 rounded shrink-0" 
                  style={{ backgroundColor: color }} 
                />
                <span className="text-sm font-medium text-[#334155] truncate">{item.name}</span>
              </div>
            )
          })}
        </div>
        <div className="relative w-full sm:w-[60%] flex justify-center items-center h-full min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-4 border border-[#A7F3D0] animate-pulse">
              <ShieldCheck className="w-8 h-8 text-[#059669]" />
            </div>
            <p className="text-[#065F46] text-sm font-bold">0 Incidents Reported</p>
            <p className="text-[#047857] text-[11px] font-medium mt-1">Area is secure. Center is standing by.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-square w-full max-h-[280px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius="80%"
                stroke="none"
                labelLine={false}
                isAnimationActive={false}
                label={({ cx, cy, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }) => {
                  const RADIAN = Math.PI / 180;
                  // Position labels slightly further out (70%) for the larger chart
                  const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.7;
                  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
                  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);

                  if (isNaN(percent) || percent < 0.04) return null;

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
          )}
        </div>
      </CardContent>
    </Card>
  )
}
