import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, Users, Settings, Trophy } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">列车长面试打分系统</h1>
          <p className="text-xl text-gray-600">现代化的多评委实时评分系统，支持大屏显示和数据管理</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-blue-600" />
                管理后台
              </CardTitle>
              <CardDescription>管理候选人信息、评委设置和面试流程控制</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" size="lg">
                  进入管理后台
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                评委打分
              </CardTitle>
              <CardDescription>评委使用此页面为候选人进行实时评分</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/judge">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  开始评分
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Monitor className="h-8 w-8 text-purple-600" />
                大屏显示
              </CardTitle>
              <CardDescription>实时显示评分结果和排行榜，适合大屏幕展示</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/display">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                >
                  大屏显示
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                系统特性
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">多评委支持</h3>
                  <p className="text-sm text-gray-600">支持多位评委同时在线评分</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Monitor className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">实时显示</h3>
                  <p className="text-sm text-gray-600">评分结果实时同步到大屏</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Settings className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">数据管理</h3>
                  <p className="text-sm text-gray-600">完整的候选人和评分数据管理</p>
                </div>
                <div className="text-center">
                  <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold mb-2">现代设计</h3>
                  <p className="text-sm text-gray-600">响应式设计，支持多设备访问</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>支持局域网多设备同时访问 | 实时数据同步 | 现代化界面设计</p>
        </div>
      </div>
    </div>
  )
}
