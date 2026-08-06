import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string
  fullScreen?: boolean
}

export function Loading({ className, text = "Loading...", fullScreen = false, ...props }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-muted-foreground",
        fullScreen && "min-h-screen bg-background",
        className
      )}
      {...props}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  )
}
