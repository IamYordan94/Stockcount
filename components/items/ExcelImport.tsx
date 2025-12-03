'use client'

import { useState } from 'react'
import { parseExcelFile, type ParsedSheet } from '@/lib/utils/excel'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

export default function ExcelImport() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedSheets, setParsedSheets] = useState<Map<string, ParsedSheet> | null>(null)
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<string>('')
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; details?: string } | null>(null)
  const [shopErrors, setShopErrors] = useState<Map<string, string>>(new Map())

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)

    try {
      setLoading(true)
      const sheets = await parseExcelFile(selectedFile)
      setParsedSheets(sheets)
      // Select all sheets by default
      setSelectedSheets(new Set(sheets.keys()))
    } catch (error) {
      console.error('Error parsing Excel:', error)
      setImportResult({
        success: false,
        message: 'Failed to parse Excel file. Please check the format.',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSheet = (sheetName: string) => {
    setSelectedSheets((prev) => {
      const next = new Set(prev)
      if (next.has(sheetName)) {
        next.delete(sheetName)
      } else {
        next.add(sheetName)
      }
      return next
    })
  }

  const handleImport = async () => {
    if (!parsedSheets || selectedSheets.size === 0) return

    setImporting(true)
    setImportResult(null)
    setImportProgress('Starting import...')

    try {
      const sheetsToImport = Array.from(selectedSheets)
      let successCount = 0
      let errorCount = 0
      const errors = new Map<string, string>()

      for (const sheetName of sheetsToImport) {
        const sheet = parsedSheets.get(sheetName)
        if (!sheet) continue

        setImportProgress(`Importing ${sheet.shopName}...`)

        const response = await fetch('/api/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopName: sheet.shopName,
            items: sheet.items,
          }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          successCount++
        } else {
          errorCount++
          const errorMessage = result.details || result.error || 'Unknown error'
          errors.set(sheet.shopName, errorMessage)
          console.error(`Error importing ${sheet.shopName}:`, result)
        }
      }

      setShopErrors(errors)
      setImportResult({
        success: errorCount === 0,
        message: `Import completed: ${successCount} shops imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        details: errorCount > 0 ? 'See details below for failed shops' : undefined,
      })

      if (errorCount === 0) {
        // Reset form on success
        setFile(null)
        setParsedSheets(null)
        setSelectedSheets(new Set())
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        message: 'Failed to import data. Please try again.',
      })
    } finally {
      setImporting(false)
      setImportProgress('')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Import Excel File</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Excel File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={loading || importing}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">XLSX, XLS up to 10MB</p>
            </div>
          </div>
          {file && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <span>{file.name}</span>
              <button
                onClick={() => {
                  setFile(null)
                  setParsedSheets(null)
                  setSelectedSheets(new Set())
                  setImportResult(null)
                }}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-600">Parsing Excel file...</p>
          </div>
        )}

        {parsedSheets && parsedSheets.size > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Select shops to import ({selectedSheets.size} of {parsedSheets.size} selected)
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Array.from(parsedSheets.entries()).map(([sheetName, sheet]) => (
                <div
                  key={sheetName}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSheets.has(sheetName)}
                        onChange={() => toggleSheet(sheetName)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-3 text-sm font-medium text-gray-900">
                        {sheet.shopName}
                      </label>
                    </div>
                    <p className="ml-7 text-sm text-gray-500">
                      {sheet.items.length} items
                      {sheet.errors.length > 0 && (
                        <span className="text-red-600 ml-2">
                          ({sheet.errors.length} errors)
                        </span>
                      )}
                    </p>
                    {sheet.errors.length > 0 && (
                      <div className="ml-7 mt-1 text-xs text-red-600">
                        {sheet.errors.slice(0, 3).map((error, idx) => (
                          <div key={idx}>{error}</div>
                        ))}
                        {sheet.errors.length > 3 && (
                          <div>...and {sheet.errors.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleImport}
                disabled={selectedSheets.size === 0 || importing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : `Import ${selectedSheets.size} Shop(s)`}
              </button>
            </div>

            {importProgress && (
              <div className="mt-4 text-sm text-gray-600">{importProgress}</div>
            )}
          </div>
        )}

        {importResult && (
          <div
            className={`mt-4 p-4 rounded-md ${
              importResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="ml-3 flex-1">
                <p
                  className={`text-sm font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {importResult.message}
                </p>
                {importResult.details && (
                  <p className="mt-1 text-sm text-red-700">{importResult.details}</p>
                )}
              </div>
            </div>
            {shopErrors.size > 0 && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">Failed Shops:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Array.from(shopErrors.entries()).map(([shopName, error]) => (
                    <li key={shopName} className="text-sm text-red-700">
                      <strong>{shopName}:</strong> {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

