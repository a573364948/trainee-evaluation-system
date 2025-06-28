"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutCentered } from "@/components/interview-stage-layouts/layout-centered"
import { LayoutSplit } from "@/components/interview-stage-layouts/layout-split"
import { LayoutMinimal } from "@/components/interview-stage-layouts/layout-minimal"
import { LayoutStudio } from "@/components/interview-stage-layouts/layout-studio"

// 模拟数据
const mockCurrentItem = {
  id: "item1",
  type: 'interview_stage' as const,
  title: "面试环节1",
  subtitle: "自我介绍",
  content: "",
  timeLimit: 300, // 5分钟
  startTime: Date.now()
}

const mockCandidate = {
  id: "candidate1",
  name: "张三",
  number: "EMP001",
  department: "技术部",
  status: "interviewing"
}

const mockJudges = [
  { id: "judge1", name: "李评委", isActive: true },
  { id: "judge2", name: "王评委", isActive: true },
  { id: "judge3", name: "赵评委", isActive: false },
  { id: "judge4", name: "刘评委", isActive: true },
]

const layouts = [
  {
    id: "centered",
    name: "居中大屏布局",
    description: "候选人信息和计时器突出显示，侧边栏简化",
    component: LayoutCentered,
    features: ["候选人信息突出", "大屏居中显示", "计时器醒目", "侧边栏简化"]
  },
  {
    id: "split",
    name: "左右分栏布局", 
    description: "左侧详细信息，右侧环节内容，信息层次清晰",
    component: LayoutSplit,
    features: ["信息分区明确", "计时器突出", "评委状态详细", "内容布局清晰"]
  },
  {
    id: "minimal",
    name: "极简大屏布局",
    description: "极简设计，突出核心信息，适合大屏幕显示",
    component: LayoutMinimal,
    features: ["极简设计", "超大字体", "渐变背景", "核心信息突出"]
  },
  {
    id: "studio",
    name: "演播室风格布局",
    description: "电视演播室风格，专业感强，信息丰富",
    component: LayoutStudio,
    features: ["演播室风格", "专业界面", "信息丰富", "直播感强"]
  }
]

export default function LayoutPreviewPage() {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(300000) // 5分钟

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  if (selectedLayout) {
    const layout = layouts.find(l => l.id === selectedLayout)
    if (layout) {
      const LayoutComponent = layout.component
      return (
        <div className="relative">
          {/* 返回按钮 */}
          <div className="absolute top-4 left-4 z-50">
            <Button 
              onClick={() => setSelectedLayout(null)}
              variant="outline"
              className="bg-black/50 text-white border-white/20 hover:bg-black/70"
            >
              ← 返回选择
            </Button>
          </div>
          
          {/* 布局标识 */}
          <div className="absolute top-4 right-4 z-50">
            <Badge className="bg-blue-500 text-white px-4 py-2">
              {layout.name}
            </Badge>
          </div>

          <LayoutComponent
            currentItem={mockCurrentItem}
            currentCandidate={mockCandidate}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            judges={mockJudges}
          />
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            面试环节显示布局方案
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            为面试环节（如自我介绍）设计的4种不同显示布局方案
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-800">
              <strong>设计目标：</strong>在面试环节时，侧边栏不那么显眼，候选人信息和计时器更加突出
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {layouts.map((layout) => (
            <Card key={layout.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {layout.name}
                  <Badge variant="outline">{layout.id}</Badge>
                </CardTitle>
                <CardDescription>{layout.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">特点：</h4>
                    <div className="flex flex-wrap gap-2">
                      {layout.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => setSelectedLayout(layout.id)}
                      className="w-full"
                    >
                      预览此布局
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h3>
          <div className="space-y-3 text-gray-600">
            <p>• 点击任意布局卡片可以全屏预览该布局效果</p>
            <p>• 预览时使用模拟数据：候选人"张三"，自我介绍环节，5分钟计时</p>
            <p>• 每种布局都针对面试环节进行了优化，突出候选人信息和计时器</p>
            <p>• 可以根据实际需求选择最适合的布局方案</p>
          </div>
        </div>
      </div>
    </div>
  )
}
