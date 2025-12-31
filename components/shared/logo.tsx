import { FileChartColumnIncreasing } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
}

export function Logo({ className, size = 24, showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <FileChartColumnIncreasing 
        size={size} 
        className="text-green-600"
        strokeWidth={2}
      />
      {showText && (
        <span className="font-semibold text-lg">GREEN APP</span>
      )}
    </div>
  )
}

