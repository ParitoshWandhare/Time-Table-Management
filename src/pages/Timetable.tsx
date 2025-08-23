import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Clock, MapPin, User, Book, Calendar, AlertCircle, Wand2, RefreshCw } from "lucide-react"

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
  "16:00", "16:30", "17:00", "17:30"
]

const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
]

const dayLabels = {
  Monday: "Monday",
  Tuesday: "Tuesday", 
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday"
}

// Break time slots (typically lunch break)
const BREAK_SLOTS = ["12:00", "12:30", "13:00", "13:30"]

export default function Timetable() {
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const generateTimetableMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      // First, clear existing timetable for this section
      await supabase
        .from('timetable')
        .delete()
        .eq('section_id', sectionId)

      // Get section details
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single()

      if (sectionError) throw sectionError

      // Get subjects for this section's year level
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('year_level', section.year_level)

      if (subjectsError) throw subjectsError

      // Get faculty-subject assignments
      const { data: facultySubjects, error: fsError } = await supabase
        .from('faculty_subjects')
        .select(`
          *,
          faculty (name),
          subjects (id, code, name, has_lab, has_tutorial, weekly_hours)
        `)

      if (fsError) throw fsError

      // Define specific classrooms for different types
      const lectureRooms = ['Room C-204', 'Room C-301', 'Room C-302', 'Room C-303']
      const labRooms = ['Lab C-206', 'Lab C-207', 'Lab C-208', 'Lab C-209']
      const tutorialRooms = ['T-1', 'T-2', 'T-3', 'T-4']

      // Ensure these classrooms exist
      const ensureClassrooms = async (roomNames: string[]) => {
        const existingRooms: any[] = []
        
        for (const roomName of roomNames) {
          const { data: existing } = await supabase
            .from('classrooms')
            .select('*')
            .eq('name', roomName)
            .single()
          
          if (existing) {
            existingRooms.push(existing)
          } else {
            const { data: newRoom } = await supabase
              .from('classrooms')
              .insert({ name: roomName, capacity: 60 })
              .select()
              .single()
            
            if (newRoom) existingRooms.push(newRoom)
          }
        }
        
        return existingRooms
      }

      const lectureClassrooms = await ensureClassrooms(lectureRooms)
      const labClassrooms = await ensureClassrooms(labRooms)
      const tutorialClassrooms = await ensureClassrooms(tutorialRooms)

      // Generate batch names based on section name (A -> A1, A2, A3)
      const numberOfBatches = 3
      const batches = Array.from({ length: numberOfBatches }, (_, i) => ({
        number: i + 1,
        name: `${section.name}${i + 1}`
      }))

      // Track schedules
      const facultySchedule: Record<string, Set<string>> = {} // day-time -> Set<facultyId>
      const classroomSchedule: Record<string, Set<string>> = {} // day-time -> Set<classroomId>
      const dailySchedule: Record<string, Array<{time: string, duration: number}>> = {} // day -> [{time, duration}]
      const subjectLectureCount: Record<string, Record<string, number>> = {} // subjectId -> day -> count

      // Initialize daily schedules
      daysOfWeek.forEach(day => {
        dailySchedule[day] = []
        subjects.forEach(subject => {
          if (!subjectLectureCount[subject.id]) subjectLectureCount[subject.id] = {}
          subjectLectureCount[subject.id][day] = 0
        })
      })

      // Helper functions
      const getSlotKey = (day: string, time: string) => `${day}-${time}`
      
      const markFacultyBusy = (facultyId: string, day: string, startTime: string, duration: number) => {
        let timeIndex = timeSlots.indexOf(startTime)
        for (let i = 0; i < duration * 2; i++) { // duration in hours * 2 (30-min slots)
          if (timeIndex + i < timeSlots.length) {
            const key = getSlotKey(day, timeSlots[timeIndex + i])
            if (!facultySchedule[key]) facultySchedule[key] = new Set()
            facultySchedule[key].add(facultyId)
          }
        }
      }
      
      const markClassroomOccupied = (classroomId: string, day: string, startTime: string, duration: number) => {
        let timeIndex = timeSlots.indexOf(startTime)
        for (let i = 0; i < duration * 2; i++) {
          if (timeIndex + i < timeSlots.length) {
            const key = getSlotKey(day, timeSlots[timeIndex + i])
            if (!classroomSchedule[key]) classroomSchedule[key] = new Set()
            classroomSchedule[key].add(classroomId)
          }
        }
      }

      const addToDailySchedule = (day: string, startTime: string, duration: number) => {
        dailySchedule[day].push({ time: startTime, duration })
        dailySchedule[day].sort((a, b) => timeSlots.indexOf(a.time) - timeSlots.indexOf(b.time))
      }

      const isFacultyAvailable = (facultyId: string, day: string, startTime: string, duration: number) => {
        let timeIndex = timeSlots.indexOf(startTime)
        for (let i = 0; i < duration * 2; i++) {
          if (timeIndex + i >= timeSlots.length) return false
          const key = getSlotKey(day, timeSlots[timeIndex + i])
          if (facultySchedule[key]?.has(facultyId)) return false
        }
        return true
      }

      const isClassroomAvailable = (classroomId: string, day: string, startTime: string, duration: number) => {
        let timeIndex = timeSlots.indexOf(startTime)
        for (let i = 0; i < duration * 2; i++) {
          if (timeIndex + i >= timeSlots.length) return false
          const key = getSlotKey(day, timeSlots[timeIndex + i])
          if (classroomSchedule[key]?.has(classroomId)) return false
        }
        return true
      }

      const getDailyDuration = (day: string) => {
        return dailySchedule[day].reduce((total, session) => total + session.duration, 0)
      }

      const needsBreak = (day: string, newDuration: number) => {
        const totalDuration = getDailyDuration(day) + newDuration
        return totalDuration >= 4
      }

      const findAvailableTimeSlot = (day: string, duration: number, preferredStart?: number) => {
        const startIndex = preferredStart || 0
        const maxEndIndex = timeSlots.length - (duration * 2)
        
        for (let i = startIndex; i <= maxEndIndex; i++) {
          const startTime = timeSlots[i]
          
          // Skip if it's break time and we need a break
          if (needsBreak(day, duration) && BREAK_SLOTS.includes(startTime)) {
            continue
          }
          
          // Check if this time slot works
          let canSchedule = true
          
          // If we need a break and total duration >= 4, ensure break is scheduled
          if (needsBreak(day, duration)) {
            const currentDuration = getDailyDuration(day)
            const scheduledSessions = dailySchedule[day]
            
            // Check if we need to insert a break
            if (currentDuration >= 2 && scheduledSessions.length > 0) {
              // Find if there's a natural break in the schedule
              let hasBreak = false
              for (let j = 0; j < scheduledSessions.length - 1; j++) {
                const currentEnd = timeSlots.indexOf(scheduledSessions[j].time) + (scheduledSessions[j].duration * 2)
                const nextStart = timeSlots.indexOf(scheduledSessions[j + 1].time)
                if (nextStart - currentEnd >= 2) { // 1 hour gap
                  hasBreak = true
                  break
                }
              }
              
              // If no natural break exists and we're adding more classes, ensure gap
              if (!hasBreak && scheduledSessions.length > 0) {
                const lastSession = scheduledSessions[scheduledSessions.length - 1]
                const lastEndIndex = timeSlots.indexOf(lastSession.time) + (lastSession.duration * 2)
                const currentStartIndex = i
                
                if (currentStartIndex - lastEndIndex < 2 && currentDuration >= 2) {
                  continue // Skip this slot to maintain break
                }
              }
            }
          }
          
          if (canSchedule) {
            return startTime
          }
        }
        return null
      }

      const timetableEntries: any[] = []

      // Step 1: Schedule lectures for each subject across all 5 days
      for (const subject of subjects) {
        const lectureFaculty = facultySubjects.find(fs => 
          fs.subject_id === subject.id && fs.subject_types?.includes('lecture')
        )
        
        if (!lectureFaculty) continue

        // Calculate lectures needed per week (minimum 2, distribute across days)
        const totalLectures = Math.max(2, Math.min(subject.weekly_hours, 6))
        const lecturesPerDay = Math.floor(totalLectures / 5) || 1
        const extraLectures = totalLectures % 5

        for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
          const day = daysOfWeek[dayIndex]
          let lecturesToSchedule = lecturesPerDay + (dayIndex < extraLectures ? 1 : 0)

          for (let lectureNum = 0; lectureNum < lecturesToSchedule; lectureNum++) {
            const startTime = findAvailableTimeSlot(day, 1) // 1 hour lecture
            
            if (startTime && isFacultyAvailable(lectureFaculty.faculty_id, day, startTime, 1)) {
              // Find available classroom
              let classroom = null
              for (const room of lectureClassrooms) {
                if (isClassroomAvailable(room.id, day, startTime, 1)) {
                  classroom = room
                  break
                }
              }
              
              if (classroom) {
                const timeIndex = timeSlots.indexOf(startTime)
                const endTime = timeSlots[timeIndex + 2] || '18:00'
                
                timetableEntries.push({
                  section_id: sectionId,
                  subject_id: subject.id,
                  faculty_id: lectureFaculty.faculty_id,
                  classroom_id: classroom.id,
                  day_of_week: day,
                  start_time: startTime,
                  end_time: endTime,
                  subject_type: 'lecture',
                  batch_number: null // Lectures are for entire section
                })
                
                markFacultyBusy(lectureFaculty.faculty_id, day, startTime, 1)
                markClassroomOccupied(classroom.id, day, startTime, 1)
                addToDailySchedule(day, startTime, 1)
                subjectLectureCount[subject.id][day]++
              }
            }
          }
        }
      }

      // Step 2: Schedule labs and tutorials for batches
      for (const subject of subjects) {
        if (subject.has_lab || subject.has_tutorial) {
          // Find a suitable day for practical sessions
          for (const day of daysOfWeek) {
            let allBatchesScheduled = true
            
            // Track what's scheduled for each batch on this day for this subject
            const batchScheduled = new Set<number>()
            
            // Try to schedule lab/tutorial sessions
            const labFaculty = facultySubjects.find(fs => 
              fs.subject_id === subject.id && fs.subject_types?.includes('lab')
            )
            const tutorialFaculty = facultySubjects.find(fs => 
              fs.subject_id === subject.id && fs.subject_types?.includes('tutorial')
            )

            // Find a 2-hour continuous slot
            for (let timeIndex = 0; timeIndex <= timeSlots.length - 4; timeIndex++) {
              const startTime = timeSlots[timeIndex]
              
              // Skip break times
              if (BREAK_SLOTS.includes(startTime)) continue
              
              let batchesInThisSlot = 0
              const slotAssignments: Array<{batch: number, type: 'lab' | 'tutorial', faculty: any, classroom: any}> = []

              // Try to assign all 3 batches to this time slot
              for (const batch of batches) {
                if (batchScheduled.has(batch.number)) continue
                
                // Batch 1 gets lab if available
                if (batch.number === 1 && subject.has_lab && labFaculty) {
                  if (isFacultyAvailable(labFaculty.faculty_id, day, startTime, 2)) {
                    // Find available lab classroom
                    let labClassroom = null
                    for (const room of labClassrooms) {
                      if (isClassroomAvailable(room.id, day, startTime, 2)) {
                        labClassroom = room
                        break
                      }
                    }
                    
                    if (labClassroom) {
                      slotAssignments.push({
                        batch: batch.number,
                        type: 'lab',
                        faculty: labFaculty,
                        classroom: labClassroom
                      })
                      batchesInThisSlot++
                    }
                  }
                }
                // Other batches get tutorials or labs based on availability
                else if (batch.number > 1) {
                  // Try lab first
                  if (subject.has_lab && labFaculty && 
                      isFacultyAvailable(labFaculty.faculty_id, day, startTime, 2)) {
                    let labClassroom = null
                    for (const room of labClassrooms) {
                      if (isClassroomAvailable(room.id, day, startTime, 2) && 
                          !slotAssignments.find(s => s.classroom.id === room.id)) {
                        labClassroom = room
                        break
                      }
                    }
                    
                    if (labClassroom) {
                      slotAssignments.push({
                        batch: batch.number,
                        type: 'lab',
                        faculty: labFaculty,
                        classroom: labClassroom
                      })
                      batchesInThisSlot++
                    }
                  }
                  // Try tutorial if lab not available
                  else if (subject.has_tutorial && tutorialFaculty && 
                           isFacultyAvailable(tutorialFaculty.faculty_id, day, startTime, 1)) {
                    let tutorialClassroom = null
                    for (const room of tutorialClassrooms) {
                      if (isClassroomAvailable(room.id, day, startTime, 1)) {
                        tutorialClassroom = room
                        break
                      }
                    }
                    
                    if (tutorialClassroom) {
                      // Schedule 2 tutorial sessions of 1 hour each
                      for (let tutorialSession = 0; tutorialSession < 2; tutorialSession++) {
                        const sessionStart = timeSlots[timeIndex + (tutorialSession * 2)]
                        if (sessionStart && 
                            isFacultyAvailable(tutorialFaculty.faculty_id, day, sessionStart, 1) &&
                            isClassroomAvailable(tutorialClassroom.id, day, sessionStart, 1)) {
                          
                          slotAssignments.push({
                            batch: batch.number,
                            type: 'tutorial',
                            faculty: tutorialFaculty,
                            classroom: tutorialClassroom
                          })
                          batchesInThisSlot++
                          break
                        }
                      }
                    }
                  }
                }
              }
              
              // If we successfully assigned sessions, create the timetable entries
              if (slotAssignments.length > 0) {
                for (const assignment of slotAssignments) {
                  const duration = assignment.type === 'lab' ? 2 : 1
                  const endTimeIndex = timeIndex + (duration * 2)
                  const endTime = timeSlots[endTimeIndex] || '18:00'
                  
                  timetableEntries.push({
                    section_id: sectionId,
                    subject_id: subject.id,
                    faculty_id: assignment.faculty.faculty_id,
                    classroom_id: assignment.classroom.id,
                    day_of_week: day,
                    start_time: startTime,
                    end_time: endTime,
                    subject_type: assignment.type,
                    batch_number: assignment.batch
                  })
                  
                  markFacultyBusy(assignment.faculty.faculty_id, day, startTime, duration)
                  markClassroomOccupied(assignment.classroom.id, day, startTime, duration)
                  addToDailySchedule(day, startTime, duration)
                  batchScheduled.add(assignment.batch)
                }
                
                // Break after successfully scheduling for this time slot
                if (batchScheduled.size === batches.length) {
                  break
                }
              }
            }
          }
        }
      }

      // Insert generated entries
      if (timetableEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('timetable')
          .insert(timetableEntries)

        if (insertError) throw insertError
      }

      return timetableEntries
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast({
        title: "Timetable Generated Successfully",
        description: `Generated ${data.length} classes for the selected section.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate timetable. Please try again.",
        variant: "destructive",
      })
    }
  })

  const { data: sections, isLoading: sectionsLoading, error: sectionsError } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('year_level')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const { data: timetable, isLoading, error: timetableError } = useQuery({
    queryKey: ['timetable', selectedSection],
    queryFn: async () => {
      if (!selectedSection) return []
      
      const { data, error } = await supabase
        .from('timetable')
        .select(`
          *,
          subjects (name, code),
          faculty (name),
          classrooms (name),
          sections (name, year_level)
        `)
        .eq('section_id', selectedSection)
      
      if (error) throw error
      return data || []
    },
    enabled: !!selectedSection
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
    
    return timeSlots.filter(slot => activeTimes.has(slot))
  }

  const getSubjectTypeBadge = (type: string) => {
    const variants = {
      lecture: { variant: "default" as const, icon: "📚", color: "bg-primary/10 text-primary border-primary/20" },
      lab: { variant: "secondary" as const, icon: "🔬", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      tutorial: { variant: "outline" as const, icon: "📝", color: "bg-green-500/10 text-green-600 border-green-500/20" }
    }
    
    const config = variants[type as keyof typeof variants]
    if (!config) return null
    
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const MobileTimeSlotCard = ({ day, entries }: { day: string, entries: any[] }) => (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {dayLabels[day as keyof typeof dayLabels]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No classes scheduled
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                    </Badge>
                    {getSubjectTypeBadge(entry.subject_type)}
                  </div>
                  <div className="font-medium text-sm">{entry.subjects?.code}</div>
                  <div className="text-xs text-muted-foreground">{entry.subjects?.name}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{entry.faculty?.name}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{entry.classrooms?.name}</span>
                </div>
              </div>
              
              {entry.batch_number && (
                <Badge variant="outline" className="text-xs w-fit">
                  Batch {entry.batch_number}
                </Badge>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )

  if (sectionsError || timetableError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load {sectionsError ? 'sections' : 'timetable data'}. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Timetable</h1>
          <p className="text-muted-foreground">View class schedules by section</p>
        </div>
        
        <div className="flex gap-2">
          <div className="block md:hidden">
            <Select value={viewMode} onValueChange={(value: 'desktop' | 'mobile') => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">List View</SelectItem>
                <SelectItem value="desktop">Grid View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 md:w-64">
            {sectionsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.year_level} - Section {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSection && (
            <Button 
              onClick={() => generateTimetableMutation.mutate(selectedSection)}
              disabled={generateTimetableMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateTimetableMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {generateTimetableMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          )}
        </div>
      </div>

      {selectedSection ? (
        isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : timetable && timetable.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Classes Scheduled</h3>
              <p className="text-muted-foreground text-center">
                This section doesn't have any classes scheduled yet.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'mobile' || window.innerWidth < 768 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Weekly Schedule</h2>
            </div>
            {daysOfWeek.map(day => {
              const dayEntries = timetable?.filter(entry => entry.day_of_week === day) || []
              return <MobileTimeSlotCard key={day} day={day} entries={dayEntries} />
            })}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
                <Badge variant="outline" className="ml-auto">
                  {timetable?.length || 0} classes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="border border-border p-3 bg-muted/50 font-semibold text-left sticky left-0 z-10 min-w-24">
                        Time
                      </th>
                      {daysOfWeek.map(day => (
                        <th key={day} className="border border-border p-3 bg-muted/50 font-semibold text-center min-w-48">
                          {dayLabels[day as keyof typeof dayLabels]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getActiveTimeSlots().map(time => (
                      <tr key={time} className="hover:bg-muted/30 transition-colors">
                        <td className="border border-border p-3 bg-muted/20 font-mono text-sm font-semibold sticky left-0 z-10">
                          {time}
                        </td>
                        {daysOfWeek.map(day => {
                          const entries = getTimetableCell(day, time)
                          return (
                            <td key={`${day}-${time}`} className="border border-border p-2 align-top min-h-24 bg-background">
                              {entries.map((entry, index) => (
                                <div key={index} className="mb-2 last:mb-0">
                                  <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                          <Book className="h-4 w-4 text-primary" />
                                          {entry.subjects?.code}
                                        </div>
                                        {getSubjectTypeBadge(entry.subject_type)}
                                      </div>
                                      
                                      <div className="text-sm text-muted-foreground line-clamp-2">
                                        {entry.subjects?.name}
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <User className="h-3 w-3" />
                                          <span className="truncate">{entry.faculty?.name}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span>{entry.classrooms?.name}</span>
                                          </div>
                                          {entry.batch_number && (
                                            <Badge variant="outline" className="text-xs px-2 py-0">
                                              B{entry.batch_number}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                        {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Section</h3>
            <p className="text-muted-foreground text-center">
              Choose a section from the dropdown above to view its timetable.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
