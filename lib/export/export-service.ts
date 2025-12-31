import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export interface ExportData {
  headers: string[]
  rows: (string | number)[][]
  title?: string
}

export function exportToCSV(data: ExportData): void {
  const csv = Papa.unparse({
    fields: data.headers,
    data: data.rows,
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${data.title || 'export'}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToXLSX(data: ExportData): void {
  const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, data.title || 'Sheet1')
  XLSX.writeFile(workbook, `${data.title || 'export'}.xlsx`)
}

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF()
  
  // Add title if provided
  if (data.title) {
    doc.setFontSize(16)
    doc.text(data.title, 14, 15)
  }

  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: data.title ? 25 : 15,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] }, // Green color
  })

  doc.save(`${data.title || 'export'}.pdf`)
}

export function exportData(data: ExportData, format: ExportFormat): void {
  switch (format) {
    case 'csv':
      exportToCSV(data)
      break
    case 'xlsx':
      exportToXLSX(data)
      break
    case 'pdf':
      exportToPDF(data)
      break
    default:
      throw new Error(`Formato no soportado: ${format}`)
  }
}

