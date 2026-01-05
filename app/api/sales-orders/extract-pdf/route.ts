import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pdfParse from 'pdf-parse'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export interface ParsedSalesOrder {
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

    // Parse the extracted text to find sales order data
    const parsedSO = parsePDFText(text)

    return NextResponse.json({ success: true, sales_order: parsedSO })
  } catch (error) {
    console.error('Error extracting PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar PDF' },
      { status: 500 }
    )
  }
}

function parsePDFText(text: string): ParsedSalesOrder {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let po_number = ''
  let vendor: string | undefined
  let issue_date = ''
  let delivery_date: string | undefined
  let salesperson_name: string | undefined
  let subtotal: number | undefined
  let tax: number | undefined
  let total = 0
  const line_items: ParsedSalesOrder['line_items'] = []

  // Extract header information (usually first 40 lines)
  for (let i = 0; i < Math.min(40, lines.length); i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Extract PO number - look for patterns like "Pedido de cliente 2657"
    if (!po_number) {
      // Pattern: "Pedido de cliente 2657" or "# Pedido de cliente 2657"
      const pedidoMatch = line.match(/(?:#\s*)?pedido\s+de\s+cliente\s+(\d{3,})/i)
      if (pedidoMatch && pedidoMatch[1]) {
        po_number = pedidoMatch[1]
      } else if ((upperLine.includes('PEDIDO') || upperLine.includes('ORDEN') || upperLine.includes('NÚMERO'))) {
        const numbers = extractNumbers(line)
        if (numbers.length > 0) {
          // Get the first number that looks like a PO number (usually 3+ digits)
          const poNum = numbers.find(n => n >= 100 && n < 100000)
          if (poNum) {
            po_number = Math.round(poNum).toString()
          }
        }
        // Also try extracting from text patterns like "Pedido de cliente 2657"
        const match = line.match(/(?:pedido|orden|número)[\s:]*de?\s*cliente[\s:]*(\d{3,})/i)
        if (match && match[1]) {
          po_number = match[1]
        }
      }
    }
    
    // Extract vendor - the supplier Green is buying FROM (not the customer/client)
    // Note: "Para" field is the customer/client, NOT the vendor
    // Vendor field is historically unused and will be valuable for tracking suppliers
    // Look for supplier/vendor indicators, but expect it to often be empty
    if (!vendor) {
      // Look for explicit vendor/supplier labels (not "Para" which is customer)
      if ((upperLine.includes('PROVEEDOR') || upperLine.includes('SUPPLIER') || upperLine.includes('VENDEDOR')) &&
          !upperLine.includes('PARA') && !upperLine.includes('CLIENTE')) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > -1) {
          vendor = line.substring(colonIndex + 1).trim()
        } else if (i + 1 < lines.length) {
          vendor = lines[i + 1].trim()
        }
        // Clean up common prefixes
        if (vendor) {
          vendor = vendor.replace(/^(PROVEEDOR|SUPPLIER|VENDEDOR|SEÑOR|SEÑORA|SR\.|SRA\.)\s*/i, '').trim()
        }
      }
      // Look for company name in header/footer that might be the supplier
      // This is often in the first few lines or document metadata
      // But be careful not to confuse with customer name
    }
    // If vendor is not found, leave it undefined (expected behavior)
    
    // Extract issue date - look for "Fecha" on its own line, date on next line
    if (!issue_date) {
      if (upperLine === 'FECHA' && i + 1 < lines.length) {
        const dateMatch = extractDate(lines[i + 1])
        if (dateMatch) {
          issue_date = dateMatch
        }
      } else if (upperLine.includes('FECHA') && !upperLine.includes('ENTREGA')) {
        const dateMatch = extractDate(line)
        if (dateMatch) {
          issue_date = dateMatch
        } else if (i + 1 < lines.length) {
          const dateMatchNext = extractDate(lines[i + 1])
          if (dateMatchNext) {
            issue_date = dateMatchNext
          }
        }
      }
    }
    
    // Extract delivery date - look for "Fecha de entrega" or "Fecha de entrega" on its own line
    if (!delivery_date) {
      if (upperLine.includes('FECHA DE ENTREGA') || upperLine.includes('DELIVERY DATE')) {
        const dateMatch = extractDate(line)
        if (dateMatch) {
          delivery_date = dateMatch
        } else if (i + 1 < lines.length) {
          const dateMatchNext = extractDate(lines[i + 1])
          if (dateMatchNext) {
            delivery_date = dateMatchNext
          }
        }
      }
    }
    
    // Extract salesperson - look for "Empleado del departamento de ventas:" followed by name
    if (!salesperson_name) {
      if (upperLine.includes('EMPLEADO') && upperLine.includes('VENTAS')) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > -1) {
          salesperson_name = line.substring(colonIndex + 1).trim()
        } else if (i + 1 < lines.length) {
          salesperson_name = lines[i + 1].trim()
        }
      } else if (upperLine.includes('EMPLEADO') || upperLine.includes('VENDEDOR')) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > -1) {
          salesperson_name = line.substring(colonIndex + 1).trim()
        } else if (i + 1 < lines.length) {
          salesperson_name = lines[i + 1].trim()
        }
      }
    }
  }

  // Extract totals - look for "Total", "Impuesto", "Subtotal"
  // In SAP format, these often appear as separate lines or in a table
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Extract tax - look for "Impuesto" on its own line or with value
    if (!tax && (upperLine.includes('IMPUESTO') || upperLine.includes('TAX') || upperLine.includes('IVA'))) {
      // Try to extract from current line
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        // Get the largest number (should be the tax amount)
        tax = Math.max(...numbers)
      }
      // Also check next line if current line is just the label
      if (tax === 0 && i + 1 < lines.length) {
        const nextNumbers = extractNumbers(lines[i + 1])
        if (nextNumbers.length > 0) {
          tax = Math.max(...nextNumbers)
        }
      }
    }
    
    // Extract total - look for "Total" on its own line or with value
    if (total === 0 && (upperLine.includes('TOTAL') && !upperLine.includes('SUBTOTAL') && !upperLine.includes('IMPUESTO'))) {
      // Try to extract from current line
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        // Get the largest number (should be the total amount)
        total = Math.max(...numbers)
      }
      // Also check next line if current line is just the label
      if (total === 0 && i + 1 < lines.length) {
        const nextNumbers = extractNumbers(lines[i + 1])
        if (nextNumbers.length > 0) {
          total = Math.max(...nextNumbers)
        }
      }
    }
    
    // Extract subtotal
    if (!subtotal && upperLine.includes('SUBTOTAL')) {
      const numbers = extractNumbers(line)
      if (numbers.length > 0) {
        subtotal = Math.max(...numbers)
      }
      if (!subtotal && i + 1 < lines.length) {
        const nextNumbers = extractNumbers(lines[i + 1])
        if (nextNumbers.length > 0) {
          subtotal = Math.max(...nextNumbers)
        }
      }
    }
  }

  // Extract line items - look for table structure
  // Expected format: # | Número de artículo | Descripción | Unidad de medida | Cantidad | Precio | Ctd.(UM inventario) | Total
  let inItemsSection = false
  let headerLineIndex = -1
  let lineNumber = 1
  
  // First, find the header row to understand column positions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    // Detect header row - look for "NÚMERO DE ARTÍCULO" and "DESCRIPCIÓN" together
    if ((upperLine.includes('NÚMERO') || upperLine.includes('NUMBER')) && 
        (upperLine.includes('ARTÍCULO') || upperLine.includes('ARTICLE')) &&
        (upperLine.includes('DESCRIPCIÓN') || upperLine.includes('DESCRIPTION')) &&
        (upperLine.includes('CANTIDAD') || upperLine.includes('QUANTITY'))) {
      headerLineIndex = i
      inItemsSection = true
      continue
    }
    
    // Detect end of items section
    if (inItemsSection && headerLineIndex >= 0 && i > headerLineIndex) {
      // Stop if we hit totals section or other metadata
      if (upperLine.includes('FECHA DE ENTREGA') || 
          upperLine.includes('CONDICIONES') ||
          upperLine.includes('EMPLEADO') ||
          upperLine.includes('PÁGINA') ||
          upperLine.includes('PAGE') ||
          (upperLine.includes('TOTAL') && !upperLine.match(/\d/))) {
        inItemsSection = false
        break
      }
    }
    
    // Parse line items - skip header row
    if (inItemsSection && headerLineIndex >= 0 && i > headerLineIndex) {
      const line = lines[i]
      
      // Skip empty lines
      if (!line || line.trim().length === 0) continue
      
      // Try multiple parsing strategies
      // Strategy 1: Split by multiple spaces or tabs (table format)
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0)
      
      // Strategy 2: If that doesn't work, try splitting by single space but look for patterns
      let article_number: string | undefined
      let description = ''
      let unit = ''
      let quantity = 0
      let unit_price = 0
      let line_total = 0
      
      // Check if first part is a line number (1-999)
      const firstPart = parts[0]?.trim() || ''
      const isLineNumber = /^\d{1,3}$/.test(firstPart) && parseInt(firstPart) <= 999
      
      if (isLineNumber && parts.length >= 7) {
        // Format: # | article_number | description | unit | quantity | price | inventory_qty | total
        // Example: 1 | 41111011935 | PANEL FOTOVOLTAICO 620 W | | 9 | QTZ 750.000000 | 9 | QTZ 6,750.00
        article_number = parts[1]?.trim()
        description = parts[2]?.trim() || ''
        unit = parts[3]?.trim() || ''
        quantity = parseFloat(parts[4]?.replace(/[^\d.]/g, '') || '0') || 0
        // Price might have "QTZ" prefix
        const priceStr = parts[5]?.replace(/QTZ|Q|,/g, '').trim() || '0'
        unit_price = parseFloat(priceStr) || 0
        // Total is usually the last column, might have "QTZ" prefix
        const totalStr = parts[parts.length - 1]?.replace(/QTZ|Q|,/g, '').trim() || '0'
        line_total = parseFloat(totalStr) || 0
      } else if (parts.length >= 6) {
        // Try without line number: article_number | description | unit | quantity | price | total
        article_number = parts[0]?.trim()
        description = parts[1]?.trim() || ''
        unit = parts[2]?.trim() || ''
        quantity = parseFloat(parts[3]?.replace(/[^\d.]/g, '') || '0') || 0
        const priceStr = parts[4]?.replace(/QTZ|Q|,/g, '').trim() || '0'
        unit_price = parseFloat(priceStr) || 0
        const totalStr = parts[parts.length - 1]?.replace(/QTZ|Q|,/g, '').trim() || '0'
        line_total = parseFloat(totalStr) || 0
      } else {
        // Fallback: extract numbers and try to identify columns
        // Remove currency prefixes and extract numbers
        const cleanLine = line.replace(/QTZ|Q/gi, '')
        const allNumbers = extractNumbers(cleanLine)
        
        if (allNumbers.length >= 3) {
          // Try to find article number (usually long numeric string at start)
          const articleMatch = line.match(/^(\d{8,})\s+/)
          if (articleMatch) {
            article_number = articleMatch[1]
          }
          
          // Extract description (text before first large number)
          const descMatch = line.match(/([A-ZÁÉÍÓÚÑ\s]+(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/)
          if (descMatch) {
            description = descMatch[1].trim()
          }
          
          // Quantity is usually the first small number after description
          // Price is usually a larger decimal number
          // Total is usually the largest number at the end
          if (allNumbers.length >= 3) {
            quantity = allNumbers[0] || 1
            unit_price = allNumbers[allNumbers.length - 2] || 0
            line_total = allNumbers[allNumbers.length - 1] || 0
          }
        }
      }
      
      // Validate and add line item
      if (description && 
          description.length > 2 &&
          !description.toUpperCase().includes('TOTAL') && 
          !description.toUpperCase().includes('SUBTOTAL') &&
          !description.toUpperCase().includes('IMPUESTO') &&
          !description.toUpperCase().includes('ARTÍCULO') &&
          !description.toUpperCase().includes('DESCRIPCIÓN') &&
          !description.toUpperCase().includes('NÚMERO') &&
          !description.toUpperCase().includes('CANTIDAD') &&
          !description.toUpperCase().includes('PRECIO') &&
          quantity > 0 && 
          line_total > 0) {
        
        // If unit is empty, use default
        if (!unit || unit.length === 0) {
          unit = 'UN'
        }
        
        // Calculate unit price if missing
        if (unit_price === 0 && quantity > 0 && line_total > 0) {
          unit_price = line_total / quantity
        }
        
        line_items.push({
          line_number: lineNumber++,
          article_number: article_number || undefined,
          description: description.trim(),
          unit,
          quantity,
          unit_price,
          line_total,
        })
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
  // - "Q 1,234.56" or "QTZ 1,234.56"
  // - "1,234"
  // Remove currency prefixes first
  const cleanText = text.replace(/QTZ|Q\s*/gi, '')
  const numberRegex = /[\d,]+\.?\d*/g
  const matches = cleanText.match(numberRegex) || []
  
  return matches.map(match => {
    // Remove commas and convert to number
    const cleaned = match.replace(/,/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }).filter(n => n > 0)
}

function extractDate(text: string): string | null {
  // Try to extract date in format DD/MM/YYYY or DD-MM-YYYY (most common in Guatemala)
  // Also handle formats like "25/09/2025"
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY or DD-MM-YYYY (preferred)
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY/MM/DD or YYYY-MM-DD
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      let day: string, month: string, year: string
      
      if (match[3] && match[3].length === 4) {
        // DD/MM/YYYY format (most common in Guatemala/SAP)
        day = match[1].padStart(2, '0')
        month = match[2].padStart(2, '0')
        year = match[3]
      } else {
        // YYYY/MM/DD format
        year = match[1]
        month = match[2].padStart(2, '0')
        day = match[3].padStart(2, '0')
      }
      
      // Validate date (check if month and day are reasonable)
      const monthNum = parseInt(month)
      const dayNum = parseInt(day)
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const date = new Date(`${year}-${month}-${day}`)
        if (!isNaN(date.getTime())) {
          return `${year}-${month}-${day}`
        }
      }
    }
  }
  
  return null
}

