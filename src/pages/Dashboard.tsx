import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Book, School, Clock, Calendar, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [facultyRes, subjectsRes, sectionsRes, timetableRes] = await Promise.all([
        supabase.from('faculty').select('*', { count: 'exact' }),
        supabase.from('subjects').select('*', { count: 'exact' }),
        supabase.from('sections').select('*', { count: 'exact' }),
        supabase.from('timetable').select('*', { count: 'exact' })
      ])

      return {
        faculty: facultyRes.count || 0,
        subjects: subjectsRes.count || 0,
        sections: sectionsRes.count || 0,
        timetableEntries: timetableRes.count || 0
      }
    }
  })

  const quickActions = [
    { title: "Manage Faculty", icon: Users, path: "/faculty", description: "Add and manage faculty members" },
    { title: "Manage Subjects", icon: Book, path: "/subjects", description: "Configure subjects and weekly hours" },
    { title: "Manage Sections", icon: School, path: "/sections", description: "Set up student sections" },
    { title: "Generate Timetable", icon: Clock, path: "/timetable", description: "Create and view timetables" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the BTech Time Table Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.faculty || 0}</div>
            <p className="text-xs text-muted-foreground">Total faculty registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subjects || 0}</div>
            <p className="text-xs text-muted-foreground">Subjects configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sections || 0}</div>
            <p className="text-xs text-muted-foreground">Student sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timetable Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.timetableEntries || 0}</div>
            <p className="text-xs text-muted-foreground">Schedule entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action) => (
          <Card key={action.path} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <action.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{action.title}</CardTitle>
              </div>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(action.path)} className="w-full">
                Open {action.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}