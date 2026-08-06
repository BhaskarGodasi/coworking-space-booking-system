import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

export interface StatsCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

export function StatsCard({ title, value, icon, description, trend, trendValue }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <span className="text-emerald-500">↑ {trendValue}</span>}
            {trend === "down" && <span className="text-red-500">↓ {trendValue}</span>}
            {trend === "neutral" && <span>{trendValue}</span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
