"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, AlertCircle } from "lucide-react"

export default function JudgeLoginPage() {
  const [formData, setFormData] = useState({
    name: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // 使用新的认证API
      const response = await fetch("/api/judge/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeName: formData.name,
          password: formData.password
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 登录成功，存储评委信息到 localStorage
          localStorage.setItem("currentJudge", JSON.stringify(data.judge))

          // 跳转到评分页面
          router.push("/judge")
        } else {
          setError(data.error || "认证失败")
        }
      } else {
        const errorText = await response.text()
        setError(errorText || "认证失败，请重试")
      }
    } catch (error) {
      console.error("登录错误:", error)
      setError("登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">评委登录</CardTitle>
          <CardDescription>请输入您的评委姓名和密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">评委姓名</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入评委姓名"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">登录密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="请输入登录密码"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !formData.name.trim() || !formData.password.trim()}
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              <p className="mb-2">测试账户：</p>
              <div className="bg-gray-100 p-3 rounded text-left">
                <p>姓名：张主任</p>
                <p>密码：123456</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
