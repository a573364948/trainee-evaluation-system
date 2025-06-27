"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onUploadSuccess: (message: string) => void
  onUploadError: (error: string) => void
  disabled?: boolean
}

export default function FileUpload({ onUploadSuccess, onUploadError, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ]

    if (!allowedTypes.includes(file.type)) {
      onUploadError("不支持的文件格式，请上传Excel文件(.xlsx, .xls)或CSV文件")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB限制
      onUploadError("文件大小不能超过10MB")
      return
    }

    setSelectedFile(file)
    setUploadStatus("idle")
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus("idle")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/admin/upload-excel", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadStatus("success")
        onUploadSuccess(result.message)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        setUploadStatus("error")
        onUploadError(result.error)
      }
    } catch (error) {
      setUploadStatus("error")
      onUploadError("上传失败，请重试")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadStatus("idle")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes("csv")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    }
    return <FileSpreadsheet className="h-8 w-8 text-blue-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* 文件拖拽区域 */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className={cn("h-12 w-12 mb-4", isDragging ? "text-blue-500" : "text-gray-400")} />
          <p className="text-lg font-medium mb-2">{isDragging ? "释放文件以上传" : "拖拽文件到此处或点击选择"}</p>
          <p className="text-sm text-gray-500 mb-4">支持 Excel (.xlsx, .xls) 和 CSV 文件</p>
          <Button variant="outline" disabled={disabled}>
            选择文件
          </Button>
        </CardContent>
      </Card>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 选中的文件信息 */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile)}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                {uploadStatus === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
                {uploadStatus === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
              </div>
              <div className="flex items-center gap-2">
                {uploadStatus === "idle" && (
                  <>
                    <Button onClick={handleUpload} disabled={isUploading} size="sm">
                      {isUploading ? "上传中..." : "上传"}
                    </Button>
                    <Button onClick={handleRemoveFile} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {uploadStatus === "success" && (
                  <Button onClick={handleRemoveFile} variant="outline" size="sm">
                    移除
                  </Button>
                )}
                {uploadStatus === "error" && (
                  <>
                    <Button onClick={handleUpload} disabled={isUploading} size="sm">
                      重试
                    </Button>
                    <Button onClick={handleRemoveFile} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
