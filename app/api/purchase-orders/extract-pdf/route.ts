import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pdfParse from 'pdf-parse'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export interface ParsedPurchaseOrder {
  po_number: string
  vendor?: string
  issue_date: string // ISO date string
  delivery_date?: string // ISO date string
  salesperson_name?: string
  subtotal?: number
  tax?: number
  total: number
  line_items: Array<{
    line_number: number
    article_number?: string
    description: string
    unit: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

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

    // Parse the extracted text to find purchase order data
    const parsedPO = parsePDFText(text)

    return NextResponse.json({ success: true, purchase_order: parsedPO })
  } catch (error) {
    console.error('Error extracting PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar PDF' },
      { status: 500 }
    )
  }
}

function parsePDFText(text: string): ParsedPurchaseOrder {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let po_number = ''
  let vendor: string | undefined
  let issue_date = ''
  let delivery_date: string | undefined
  let salesperson_name: string | undefined
  let subtotal: number | undefined
  let tax: number | undefined
  let total = 0
  const line_items: ParsedPurchaseOrder['line_items'] = []

  // Extract header information (usually first 30 lines)
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Extract PO number - look for patterns like "Pedido de cliente 2657" or "Número: 2657"
    if ((upperLine.includes('PEDIDO') || upperLine.includes('ORDEN') || upperLine.includes('NÚMERO')) && 
        !po_number) {
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        // Get the first number that looks like a PO number (usually 4+ digits)
        const poNum = numbers.find(n => n >= 1000 && n < 100000)
        if (poNum) {
          po_number = Math.round(poNum).toString()
        }
      }
      // Also try extracting from text patterns like "Pedido de cliente 2657"
      const match = line.match(/(?:pedido|orden|número)[\s:]*(\d{4,})/i)
      if (match && match[1]) {
        po_number = match[1]
      }
    }
    
    // Extract vendor - look for "Para" or vendor name
    if ((upperLine.includes('PARA') || upperLine.includes('VENDEDOR') || upperLine.includes('PROVEEDOR')) && 
        !vendor && line.length > 5 && line.length < 100) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > -1) {
        vendor = line.substring(colonIndex + 1).trim()
      } else if (i + 1 < lines.length) {
        vendor = lines[i + 1].trim()
      }
      // Clean up common prefixes
      if (vendor) {
        vendor = vendor.replace(/^(PARA|VENDEDOR|PROVEEDOR|SEÑOR|SEÑORA|SR\.|SRA\.)\s*/i, '').trim()
      }
    }
    
    // Extract issue date - look for "Fecha" patterns
    if ((upperLine.includes('FECHA') && !upperLine.includes('ENTREGA')) && !issue_date) {
      const dateMatch = extractDate(line)
      if (dateMatch) {
        issue_date = dateMatch
      }
    }
    
    // Extract delivery date - look for "Fecha de entrega" or "Delivery date"
    if ((upperLine.includes('FECHA DE ENTREGA') || upperLine.includes('DELIVERY DATE')) && !delivery_date) {
      const dateMatch = extractDate(line)
      if (dateMatch) {
        delivery_date = dateMatch
      }
    }
    
    // Extract salesperson - look for "Empleado" or "Vendedor"
    if ((upperLine.includes('EMPLEADO') || upperLine.includes('VENDEDOR') || upperLine.includes('SALES')) && 
        !salesperson_name) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > -1) {
        salesperson_name = line.substring(colonIndex + 1).trim()
      } else if (i + 1 < lines.length) {
        salesperson_name = lines[i + 1].trim()
      }
    }
  }

  // Extract totals - look for "Total", "Impuesto", "Subtotal"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Extract total
    if ((upperLine.includes('TOTAL') && !upperLine.includes('SUBTOTAL') && !upperLine.includes('IMPUESTO')) && 
        total === 0) {
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        total = Math.max(...numbers)
      }
    }
    
    // Extract subtotal
    if (upperLine.includes('SUBTOTAL') && !subtotal) {
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        subtotal = Math.max(...numbers)
      }
    }
    
    // Extract tax
    if ((upperLine.includes('IMPUESTO') || upperLine.includes('TAX') || upperLine.includes('IVA')) && !tax) {
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        tax = Math.max(...numbers)
      }
    }
  }

  // Extract line items - look for table structure
  // Expected format: # | Article Number | Description | Unit | Quantity | Price | Total
  let inItemsSection = false
  let lineNumber = 1
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Detect start of items section
    if ((upperLine.includes('ARTÍCULO') || upperLine.includes('ARTICLE') || 
         upperLine.includes('NÚMERO') || upperLine.includes('NUMBER')) &&
        (upperLine.includes('DESCRIPCIÓN') || upperLine.includes('DESCRIPTION') ||
         upperLine.includes('CANTIDAD') || upperLine.includes('QUANTITY'))) {
      inItemsSection = true
      continue
    }
    
    // Detect end of items section
    if (inItemsSection && (upperLine.includes('TOTAL') || upperLine.includes('SUBTOTAL') || 
        upperLine.includes('FECHA DE ENTREGA') || upperLine.includes('CONDICIONES'))) {
      inItemsSection = false
    }
    
    // Parse line items
    if (inItemsSection && i > 0) {
      // Try to parse table row
      // Format: number | article_number | description | unit | quantity | price | total
      const parts = line.split(/\s{2,}|\t|\|/).filter(p => p.trim().length > 0)
      
      if (parts.length >= 4) {
        // Try to extract article number (usually second column if first is line number)
        const firstPart = parts[0].trim()
        const isLineNumber = /^\d+$/.test(firstPart)
        
        let article_number: string | undefined
        let description = ''
        let unit = ''
        let quantity = 0
        let unit_price = 0
        let line_total = 0
        
        if (isLineNumber && parts.length >= 6) {
          // Format: # | article_number | description | unit | quantity | price | total
          article_number = parts[1].trim()
          description = parts[2].trim()
          unit = parts[3].trim() || ''
          quantity = parseFloat(parts[4].replace(/,/g, '')) || 0
          unit_price = parseFloat(parts[5].replace(/,/g, '')) || 0
          line_total = parseFloat(parts[6]?.replace(/,/g, '') || '0') || 0
        } else if (parts.length >= 5) {
          // Format: article_number | description | unit | quantity | price | total
          article_number = parts[0].trim()
          description = parts[1].trim()
          unit = parts[2].trim() || ''
          quantity = parseFloat(parts[3].replace(/,/g, '')) || 0
          unit_price = parseFloat(parts[4].replace(/,/g, '')) || 0
          line_total = parseFloat(parts[5]?.replace(/,/g, '') || '0') || 0
        } else {
          // Fallback: try to extract numbers and text
          const numbers = extractNumbers(line)
          const textParts = line.split(/\d/).filter(p => p.trim().length > 0)
          
          if (numbers.length >= 3 && textParts.length > 0) {
            description = textParts[0].trim() || parts[0].trim()
            quantity = numbers[0] || 1
            unit_price = numbers.length >= 2 ? numbers[numbers.length - 2] : 0
            line_total = numbers[numbers.length - 1] || 0
          }
        }
        
        // Skip if it looks like a header or summary row
        if (description && 
            !description.toUpperCase().includes('TOTAL') && 
            !description.toUpperCase().includes('SUBTOTAL') &&
            !description.toUpperCase().includes('ARTÍCULO') &&
            !description.toUpperCase().includes('DESCRIPCIÓN') &&
            quantity > 0 && line_total > 0) {
          
          // If unit is empty, try to infer from description or use default
          if (!unit) {
            unit = 'UN' // Default unit
          }
          
          line_items.push({
            line_number: lineNumber++,
            article_number: article_number || undefined,
            description,
            unit,
            quantity,
            unit_price: unit_price || (line_total / quantity),
            line_total,
          })
        }
      }
    }
  }

  // Calculate total from line items if not found
  if (total === 0 && line_items.length > 0) {
    total = line_items.reduce((sum, item) => sum + item.line_total, 0)
  }

  // Calculate subtotal if not found
  if (!subtotal && total > 0 && tax) {
    subtotal = total - tax
  } else if (!subtotal && line_items.length > 0) {
    subtotal = line_items.reduce((sum, item) => sum + item.line_total, 0)
  }

  // Don't set defaults - let the UI handle missing values
  // This allows the user to fill in missing information

  return {
    po_number,
    vendor,
    issue_date,
    delivery_date,
    salesperson_name,
    subtotal,
    tax,
    total,
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

function extractDate(text: string): string | null {
  // Try to extract date in format DD/MM/YYYY or DD-MM-YYYY
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY/MM/DD or YYYY-MM-DD
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      let day: string, month: string, year: string
      
      if (match[3] && match[3].length === 4) {
        // DD/MM/YYYY format
        day = match[1].padStart(2, '0')
        month = match[2].padStart(2, '0')
        year = match[3]
      } else {
        // YYYY/MM/DD format
        year = match[1]
        month = match[2].padStart(2, '0')
        day = match[3].padStart(2, '0')
      }
      
      // Validate date
      const date = new Date(`${year}-${month}-${day}`)
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`
      }
    }
  }
  
  return null
}

