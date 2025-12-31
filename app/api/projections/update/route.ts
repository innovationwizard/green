import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get date range (last 7 days to today)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    // Execute projection functions
    const { error: costsError } = await supabase.rpc('compute_project_costs_daily', {
      start_date: startDateStr,
      end_date: endDateStr,
    })
    
    if (costsError) {
      console.error('Error computing costs:', costsError)
    }
    
    const { error: revenueError } = await supabase.rpc('compute_project_revenue_daily', {
      start_date: startDateStr,
      end_date: endDateStr,
    })
    
    if (revenueError) {
      console.error('Error computing revenue:', revenueError)
    }
    
    // Update checkpoint
    const { error: checkpointError } = await supabase.rpc('update_projection_checkpoint')
    
    if (checkpointError) {
      console.error('Error updating checkpoint:', checkpointError)
    }
    
    if (costsError || revenueError || checkpointError) {
      return NextResponse.json(
        { 
          success: false, 
          errors: {
            costs: costsError?.message,
            revenue: revenueError?.message,
            checkpoint: checkpointError?.message,
          }
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      processed: {
        start_date: startDateStr,
        end_date: endDateStr,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

