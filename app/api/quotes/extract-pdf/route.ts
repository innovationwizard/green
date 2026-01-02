import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pdfParse from 'pdf-parse'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin or developer
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<UserRow, 'role'> | null }

    if (!userData || (userData.role !== 'admin' && userData.role !== 'developer')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
    }

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    // Parse the extracted text to find quote data
    const parsedQuote = parsePDFText(text)

    return NextResponse.json({ success: true, quote: parsedQuote })
  } catch (error) {
    console.error('Error extracting PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar PDF' },
      { status: 500 }
    )
  }
}

function parsePDFText(text: string) {
  // Extract quote data from PDF text using pattern matching
  // This is a basic implementation - can be enhanced with coordinate-based extraction later
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let quoted_revenue = 0
  let quoted_materials: number | undefined
  let quoted_labor: number | undefined
  let quoted_subcontractors: number | undefined
  let quoted_expenses: number | undefined
  let system_size_kw: number | undefined
  let expected_duration_days: number | undefined
  const line_items: Array<{
    quote_product_name: string
    quantity: number
    unit_price: number
    total: number
    description?: string
  }> = []

  // Look for totals and summary information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    
    // Extract total/revenue
    if ((line.includes('TOTAL') || line.includes('SUBTOTAL') || line.includes('REVENUE')) && 
        !line.includes('MATERIAL') && !line.includes('LABOR')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        const total = Math.max(...numbers)
        if (total > quoted_revenue) {
          quoted_revenue = total
        }
      }
    }
    
    // Extract materials
    if (line.includes('MATERIAL') || line.includes('MATERIALES')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        quoted_materials = Math.max(...numbers)
      }
    }
    
    // Extract labor
    if (line.includes('MANO DE OBRA') || line.includes('LABOR') || line.includes('MANO_OBRA')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        quoted_labor = Math.max(...numbers)
      }
    }
    
    // Extract subcontractors
    if (line.includes('SUBCONTRATISTA') || line.includes('SUBCONTRACTOR')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        quoted_subcontractors = Math.max(...numbers)
      }
    }
    
    // Extract expenses
    if (line.includes('GASTO') || line.includes('EXPENSE')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        quoted_expenses = Math.max(...numbers)
      }
    }
    
    // Extract system size
    if (line.includes('KW') || line.includes('KILOWATT') || line.includes('TAMAÑO')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        system_size_kw = Math.max(...numbers.filter(n => n > 0 && n < 10000)) // Reasonable range for kW
      }
    }
    
    // Extract duration
    if (line.includes('DÍA') || line.includes('DAY') || line.includes('DURACIÓN') || line.includes('DURATION')) {
      const numbers = extractNumbers(lines[i])
      if (numbers.length > 0) {
        const days = numbers.find(n => n > 0 && n < 365) // Reasonable range for days
        if (days) expected_duration_days = Math.round(days)
      }
    }
  }

  // Extract line items - look for patterns like: Product Name | Quantity | Price | Total
  // Common patterns:
  // - "Item Description    10    100.00    1,000.00"
  // - "Producto/Código    Cantidad    Precio Unitario    Total"
  
  let inItemsSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Detect start of items section
    if (upperLine.includes('PRODUCTO') || upperLine.includes('ITEM') || 
        upperLine.includes('DESCRIPCIÓN') || upperLine.includes('DESCRIPTION')) {
      if (upperLine.includes('CANTIDAD') || upperLine.includes('QUANTITY') ||
          upperLine.includes('PRECIO') || upperLine.includes('PRICE')) {
        inItemsSection = true
        continue
      }
    }
    
    // Detect end of items section
    if (inItemsSection && (upperLine.includes('TOTAL') || upperLine.includes('SUBTOTAL') || 
        upperLine.includes('MATERIAL') || upperLine.includes('LABOR'))) {
      inItemsSection = false
    }
    
    // Parse line items
    if (inItemsSection && i > 0) {
      // Try to extract: product name, quantity, unit price, total
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0)
      
      if (parts.length >= 3) {
        // Try to parse as: Name | Qty | Unit Price | Total
        const numbers = extractNumbers(line)
        const textParts = line.split(/\d/).filter(p => p.trim().length > 0)
        
        if (numbers.length >= 2 && textParts.length > 0) {
          const productName = textParts[0].trim() || parts[0].trim()
          const quantity = numbers[0] || 1
          const unitPrice = numbers.length >= 2 ? numbers[numbers.length - 2] : 0
          const total = numbers[numbers.length - 1] || (unitPrice * quantity)
          
          // Skip if it looks like a header or summary row
          if (!productName.toUpperCase().includes('TOTAL') && 
              !productName.toUpperCase().includes('SUBTOTAL') &&
              quantity > 0 && total > 0) {
            line_items.push({
              quote_product_name: productName,
              quantity,
              unit_price: unitPrice || total / quantity,
              total,
            })
          }
        }
      }
    }
  }

  // Calculate revenue from line items if not found
  if (quoted_revenue === 0 && line_items.length > 0) {
    quoted_revenue = line_items.reduce((sum, item) => sum + item.total, 0)
  }

  return {
    quoted_revenue,
    quoted_materials: quoted_materials || undefined,
    quoted_labor: quoted_labor || undefined,
    quoted_subcontractors: quoted_subcontractors || undefined,
    quoted_expenses: quoted_expenses || undefined,
    system_size_kw,
    expected_duration_days,
    line_items,
  }
}

function extractNumbers(text: string): number[] {
  // Extract all numbers from text, handling formats like:
  // - "1,234.56"
  // - "1234.56"
  // - "Q 1,234.56"
  // - "1,234"
  const numberRegex = /[\d,]+\.?\d*/g
  const matches = text.match(numberRegex) || []
  
  return matches.map(match => {
    // Remove commas and convert to number
    const cleaned = match.replace(/,/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }).filter(n => n > 0)
}

