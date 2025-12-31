import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Database } from '@/types/database.types'

export interface QuoteLineItem {
  quote_product_name: string
  quantity: number
  unit_price: number
  total: number
  description?: string
}

export interface ParsedQuote {
  quoted_revenue: number
  quoted_materials?: number
  quoted_labor?: number
  quoted_subcontractors?: number
  quoted_expenses?: number
  system_size_kw?: number
  expected_duration_days?: number
  line_items: QuoteLineItem[]
}

export async function parseCSVQuote(file: File): Promise<ParsedQuote> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const quote = parseQuoteData(results.data as any[])
          resolve(quote)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => reject(error),
    })
  })
}

export async function parseXLSXQuote(file: File): Promise<ParsedQuote> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        const quote = parseQuoteData(jsonData as any[])
        resolve(quote)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function parseQuoteData(data: any[]): ParsedQuote {
  let quoted_revenue = 0
  let quoted_materials = 0
  let quoted_labor = 0
  let quoted_subcontractors = 0
  let quoted_expenses = 0
  let system_size_kw: number | undefined
  let expected_duration_days: number | undefined
  const line_items: QuoteLineItem[] = []

  // Expected CSV/XLSX format:
  // - Header row with: Producto/Código, Cantidad, Precio Unitario, Total, Descripción (opcional)
  // - Or header row with: Item, Qty, Unit Price, Amount, Notes (opcional)
  // - Summary rows may contain: TOTAL, MATERIALES, MANO_OBRA, SUBCONTRATISTAS, GASTOS, TAMAÑO_KW, DURACIÓN_DÍAS

  for (const row of data) {
    const productName = row.Producto || row['Producto/Código'] || row.Item || row.product_name || ''
    const quantity = parseFloat(row.Cantidad || row.Qty || row.quantity || '0')
    const unitPrice = parseFloat(row['Precio Unitario'] || row['Unit Price'] || row.unit_price || '0')
    const total = parseFloat(row.Total || row.Amount || row.total || '0')
    const description = row.Descripción || row.Description || row.Notes || row.description || ''

    // Check if this is a summary row
    const upperProduct = productName.toUpperCase()
    if (upperProduct.includes('TOTAL') || upperProduct.includes('REVENUE')) {
      if (total > 0) quoted_revenue = total
      continue
    }
    if (upperProduct.includes('MATERIALES') || upperProduct.includes('MATERIALS')) {
      quoted_materials = total
      continue
    }
    if (upperProduct.includes('MANO_OBRA') || upperProduct.includes('LABOR')) {
      quoted_labor = total
      continue
    }
    if (upperProduct.includes('SUBCONTRATISTAS') || upperProduct.includes('SUBCONTRACTORS')) {
      quoted_subcontractors = total
      continue
    }
    if (upperProduct.includes('GASTOS') || upperProduct.includes('EXPENSES')) {
      quoted_expenses = total
      continue
    }
    if (upperProduct.includes('TAMAÑO') || upperProduct.includes('SIZE')) {
      system_size_kw = total
      continue
    }
    if (upperProduct.includes('DURACIÓN') || upperProduct.includes('DURATION')) {
      expected_duration_days = Math.round(total)
      continue
    }

    // Regular line item
    if (productName && quantity > 0) {
      line_items.push({
        quote_product_name: productName,
        quantity,
        unit_price: unitPrice || total / quantity,
        total: total || unitPrice * quantity,
        description,
      })
    }
  }

  // Calculate totals if not provided
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

export async function extractPDFQuote(file: File): Promise<ParsedQuote> {
  // PDF extraction is a placeholder - requires pdf-parse or similar
  // For now, return a basic structure
  // In production, this would use pdf-parse with coordinate-based extraction
  
  throw new Error('PDF extraction not yet implemented. Please use CSV or XLSX format.')
  
  // Future implementation would look like:
  // const pdfBuffer = await file.arrayBuffer()
  // const pdfData = await pdfParse(Buffer.from(pdfBuffer))
  // return parsePDFText(pdfData.text)
}

