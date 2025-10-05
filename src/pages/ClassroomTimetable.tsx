import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, MapPin, User, Book, AlertCircle, DoorOpen } from "lucide-react"

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
]

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

const dayLabels = {
  Monday: "Mon",
  Tuesday: "Tue", 
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri"
}

export default function ClassroomTimetable() {
  const [selectedClassroom, setSelectedClassroom] = useState("")

  const { data: classrooms, isLoading: classroomsLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ['classroom-timetable', selectedClassroom],
    queryFn: async () => {
      if (!selectedClassroom) return []
      
      const { data, error } = await supabase
        .from('timetable')
        .select(`
          *,
          sections (name, year_level),
          subjects (name, code),
          faculty (name)
        `)
        .eq('classroom_id', selectedClassroom)
        .order('day_of_week')
        .order('start_time')
      
      if (error) throw error
      return data
    },
    enabled: !!selectedClassroom
  })

  const getTimetableCell = (day: string, time: string) => {
    if (!timetable) return []
    
    return timetable.filter(entry => {
      const entryTime = entry.start_time.substring(0, 5)
      return entry.day_of_week === day && entryTime === time
    })
  }

  const getActiveTimeSlots = () => {
    if (!timetable || timetable.length === 0) return timeSlots
    
    const activeTimes = new Set(
      timetable.map(entry => entry.start_time.substring(0, 5))
    )
    
    return timeSlots.filter(time => activeTimes.has(time))
  }

  const getSubjectTypeBadge = (type: string) => {
    const styles = {
      lecture: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      lab: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      tutorial: 'bg-green-500/10 text-green-700 dark:text-green-300'
    }
    return styles[type as keyof typeof styles] || 'bg-gray-500/10 text-gray-700'
  }

  if (classroomsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const activeTimeSlots = getActiveTimeSlots()
  const selectedClassroomData = classrooms?.find(c => c.id === selectedClassroom)

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Classroom Timetable</h1>
          <p className="text-muted-foreground">View usage schedule for classrooms</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Classroom</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms?.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4" />
                      {classroom.name} 
                      <Badge variant="outline" className="text-xs capitalize ml-2">
                        {classroom.room_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {!selectedClassroom && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a classroom to view its timetable.
          </AlertDescription>
        </Alert>
      )}

      {selectedClassroom && timetableLoading && (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      {selectedClassroom && !timetableLoading && timetable && timetable.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No classes scheduled in this classroom yet.
          </AlertDescription>
        </Alert>
      )}

      {selectedClassroom && !timetableLoading && timetable && timetable.length > 0 && (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border p-3 text-left font-semibold min-w-[100px]">
                          <Clock className="h-4 w-4 inline mr-2" />
                          Time
                        </th>
                        {daysOfWeek.map((day) => (
                          <th key={day} className="border p-3 text-center font-semibold min-w-[180px]">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTimeSlots.map((time) => (
                        <tr key={time} className="hover:bg-muted/30 transition-colors">
                          <td className="border p-3 font-medium bg-muted/30">
                            {time}
                          </td>
                          {daysOfWeek.map((day) => {
                            const entries = getTimetableCell(day, time)
                            return (
                              <td key={`${day}-${time}`} className="border p-2">
                                {entries.length > 0 ? (
                                  <div className="space-y-2">
                                    {entries.map((entry, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-card border hover:shadow-md transition-shadow"
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="font-semibold text-sm truncate flex-1">
                                              {entry.subjects?.code}
                                            </div>
                                            <Badge className={`text-xs capitalize ${getSubjectTypeBadge(entry.subject_type)}`}>
                                              {entry.subject_type}
                                            </Badge>
                                          </div>
                                          <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                              <Book className="h-3 w-3 shrink-0" />
                                              <span className="truncate">{entry.sections?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <User className="h-3 w-3 shrink-0" />
                                              <span className="truncate">{entry.faculty?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3 shrink-0" />
                                              <span>
                                                {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground text-sm py-4">-</div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden space-y-4">
            {daysOfWeek.map((day) => {
              const dayEntries = timetable.filter(entry => entry.day_of_week === day)
              if (dayEntries.length === 0) return null
              
              return (
                <Card key={day}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{day}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dayEntries.map((entry, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold">{entry.subjects?.code}</div>
                          <Badge className={`capitalize ${getSubjectTypeBadge(entry.subject_type)}`}>
                            {entry.subject_type}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>
                              {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Book className="h-4 w-4 shrink-0" />
                            <span>{entry.sections?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0" />
                            <span>{entry.faculty?.name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
