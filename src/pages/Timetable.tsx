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
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
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

export default function Timetable() {
  const [selectedSection, setSelectedSection] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

      // Get existing timetable entries from ALL sections to prevent faculty AND classroom conflicts
      const { data: existingTimetable, error: existingError } = await supabase
        .from('timetable')
        .select(`
          id,
          faculty_id,
          classroom_id,
          day_of_week,
          start_time,
          end_time,
          section_id,
          subject_id,
          subject_type
        `)
        .neq('section_id', sectionId) // Exclude current section as we're regenerating it

      if (existingError) throw existingError

      // Load available classrooms by type (no auto-creation)
      const { data: lectureClassroomsRaw, error: lectureRoomsError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('room_type', 'lecture')
      const { data: labClassroomsRaw, error: labRoomsError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('room_type', 'lab')
      const { data: tutorialClassroomsRaw, error: tutorialRoomsError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('room_type', 'tutorial')

      if (lectureRoomsError || labRoomsError || tutorialRoomsError) {
        throw lectureRoomsError || labRoomsError || tutorialRoomsError
      }

      const lectureClassrooms = lectureClassroomsRaw || []
      const labClassrooms = labClassroomsRaw || []
      const tutorialClassrooms = tutorialClassroomsRaw || []

      // Time slots and scheduling helpers (updated for hourly slots)
      const BREAK_START = 4 // 12:00 PM index in timeSlots array
      const BREAK_END = 4   // 12:00 PM only (1 hour break)
      
      // Helper functions (updated for hourly slots)
      const getTimeIndex = (time) => timeSlots.indexOf(time)
      
      const isSlotAvailable = (day, timeIndex, duration = 1) => {
        const endIndex = timeIndex + duration // duration in hours
        for (let i = timeIndex; i < endIndex && i < timeSlots.length; i++) {
          if (schedule[day][i] !== null) return false
        }
        return endIndex <= timeSlots.length
      }
      
      const isFacultyAvailable = (facultyId, day, timeIndex, duration = 1) => {
        const endIndex = timeIndex + duration
        for (let i = timeIndex; i < endIndex && i < timeSlots.length; i++) {
          if (facultySchedule[day][i] && facultySchedule[day][i].has(facultyId)) {
            return false
          }
        }
        return true
      }
      
      const isClassroomAvailable = (classroomId, day, timeIndex, duration = 1) => {
        const endIndex = timeIndex + duration
        for (let i = timeIndex; i < endIndex && i < timeSlots.length; i++) {
          if (classroomSchedule[day][i] && classroomSchedule[day][i].has(classroomId)) {
            return false
          }
        }
        return true
      }
      
      const markSlotOccupied = (day, timeIndex, duration, facultyId, classroomId, entry) => {
        const endIndex = timeIndex + duration
        for (let i = timeIndex; i < endIndex && i < timeSlots.length; i++) {
          schedule[day][i] = entry
          
          if (!facultySchedule[day][i]) facultySchedule[day][i] = new Set()
          facultySchedule[day][i].add(facultyId)
          
          if (!classroomSchedule[day][i]) classroomSchedule[day][i] = new Set()
          classroomSchedule[day][i].add(classroomId)
        }
      }
      
      // Scheduling state
      const schedule = {}
      const facultySchedule = {}
      const classroomSchedule = {}
      const subjectWeeklyHours = {}
      
      // Initialize scheduling state with proper faculty tracking
      daysOfWeek.forEach(day => {
        schedule[day] = Array(timeSlots.length).fill(null)
        facultySchedule[day] = Array(timeSlots.length).fill(null).map(() => new Set())
        classroomSchedule[day] = Array(timeSlots.length).fill(null).map(() => new Set())
      })
      
      subjects.forEach(subject => {
        subjectWeeklyHours[subject.id] = 0
      })
      
      // Populate faculty schedule AND classroom schedule with existing timetable entries from other sections
      if (existingTimetable && existingTimetable.length > 0) {
        existingTimetable.forEach(entry => {
          const startIndex = getTimeIndex(entry.start_time.substring(0, 5))
          const endIndex = getTimeIndex(entry.end_time.substring(0, 5))
          
          if (startIndex !== -1 && endIndex !== -1) {
            const duration = endIndex - startIndex
            
            // Mark faculty AND classroom as occupied for the duration of this existing class
            for (let i = startIndex; i < startIndex + duration && i < timeSlots.length; i++) {
              // Mark faculty as occupied
              if (!facultySchedule[entry.day_of_week]) {
                facultySchedule[entry.day_of_week] = Array(timeSlots.length).fill(null).map(() => new Set())
              }
              if (!facultySchedule[entry.day_of_week][i]) {
                facultySchedule[entry.day_of_week][i] = new Set()
              }
              facultySchedule[entry.day_of_week][i].add(entry.faculty_id)
              
              // Mark classroom as occupied (CRITICAL FIX)
              if (!classroomSchedule[entry.day_of_week]) {
                classroomSchedule[entry.day_of_week] = Array(timeSlots.length).fill(null).map(() => new Set())
              }
              if (!classroomSchedule[entry.day_of_week][i]) {
                classroomSchedule[entry.day_of_week][i] = new Set()
              }
              classroomSchedule[entry.day_of_week][i].add(entry.classroom_id)
            }
          }
        })
      }
      
      // Get random starting times for variety (updated for hourly indices)
      const getRandomStartTimes = () => {
        const startTimes = [0, 1, 2, 3, 5, 6, 7, 8, 9] // Skip break time (index 4 = 12:00)
        return startTimes.sort(() => Math.random() - 0.5)
      }
      
      // Check if time is during break (12:00 PM)
      const isBreakTime = (timeIndex) => {
        return timeIndex === BREAK_START
      }
      
      // Find best time slot for a class
      const findBestTimeSlot = (day, duration, facultyId, classroom, preferredTimes = null) => {
        const timesToTry = preferredTimes || getRandomStartTimes()
        
        for (const startIndex of timesToTry) {
          // Skip break times for regular classes
          if (isBreakTime(startIndex)) continue
          
          // Ensure the class doesn't span across break time
          const endIndex = startIndex + duration
          let spansBreak = false
          for (let i = startIndex; i < endIndex; i++) {
            if (isBreakTime(i)) {
              spansBreak = true
              break
            }
          }
          if (spansBreak) continue
          
          if (isSlotAvailable(day, startIndex, duration) &&
              isFacultyAvailable(facultyId, day, startIndex, duration) &&
              isClassroomAvailable(classroom.id, day, startIndex, duration)) {
            return startIndex
          }
        }
        
        // If preferred times don't work, try all available slots (excluding breaks)
        for (let i = 0; i < timeSlots.length - duration; i++) {
          if (isBreakTime(i)) continue
          
          // Ensure the class doesn't span across break time
          const endIndex = i + duration
          let spansBreak = false
          for (let j = i; j < endIndex; j++) {
            if (isBreakTime(j)) {
              spansBreak = true
              break
            }
          }
          if (spansBreak) continue
          
          if (isSlotAvailable(day, i, duration) &&
              isFacultyAvailable(facultyId, day, i, duration) &&
              isClassroomAvailable(classroom.id, day, i, duration)) {
            return i
          }
        }
        
        return null
      }
      
      const timetableEntries = []
      const shuffledDays = [...daysOfWeek].sort(() => Math.random() - 0.5)
      
      // Track which subjects already have lectures on each day
      const dailySubjectLectures = {}
      daysOfWeek.forEach(day => {
        dailySubjectLectures[day] = new Set()
      })
      
      // Track classroom usage to ensure rotation
      let lectureRoomIndex = 0
      let labRoomIndex = 0
      let tutorialRoomIndex = 0
      
      // Track faculty usage to ensure fair distribution
      const facultyUsageCount = {}
      
      // Step 1: Schedule lectures - ONE lecture per subject per day maximum
      for (const subject of subjects) {
        // Get ALL faculty who can teach this subject's lectures
        const qualifiedLectureFaculty = facultySubjects.filter(fs => 
          fs.subject_id === subject.id && fs.subject_types?.includes('lecture')
        )
        
        if (qualifiedLectureFaculty.length === 0) continue
        
        // Select a faculty member with least load (round-robin distribution)
        const lectureFaculty = qualifiedLectureFaculty.reduce((leastUsed, current) => {
          const leastUsedCount = facultyUsageCount[leastUsed.faculty_id] || 0
          const currentCount = facultyUsageCount[current.faculty_id] || 0
          return currentCount < leastUsedCount ? current : leastUsed
        })

        const weeklyHours = subject.weekly_hours
        let hoursScheduled = 0
        
        // Schedule lectures across different days (one lecture per day max)
        const availableDays = [...shuffledDays]
        
        while (hoursScheduled < weeklyHours && availableDays.length > 0) {
          // Get the next available day
          const dayIndex = hoursScheduled % availableDays.length
          const day = availableDays[dayIndex]
          
          // Check if this subject already has a lecture on this day
          if (dailySubjectLectures[day].has(subject.id)) {
            // Remove this day from available days for this subject
            availableDays.splice(dayIndex, 1)
            if (availableDays.length === 0) break
            continue
          }
          
          // Find available classroom - try all classrooms starting from last used index
          let availableClassroom = null
          let timeIndex = null
          
          for (let i = 0; i < lectureClassrooms.length; i++) {
            const roomIndexToTry = (lectureRoomIndex + i) % lectureClassrooms.length
            const room = lectureClassrooms[roomIndexToTry]
            const slot = findBestTimeSlot(day, 1, lectureFaculty.faculty_id, room)
            
            if (slot !== null) {
              availableClassroom = room
              timeIndex = slot
              lectureRoomIndex = (roomIndexToTry + 1) % lectureClassrooms.length
              break
            }
          }
          
          if (!availableClassroom) {
            // Remove this day if no classroom available
            availableDays.splice(dayIndex, 1)
            if (availableDays.length === 0) break
            continue
          }
          const startTime = timeSlots[timeIndex]
          const endTime = timeSlots[timeIndex + 1] || '18:00'
          
          const entry = {
            section_id: sectionId,
            subject_id: subject.id,
            faculty_id: lectureFaculty.faculty_id,
            classroom_id: availableClassroom.id,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            subject_type: 'lecture',
            batch_number: null
          }
          
          timetableEntries.push(entry)
          markSlotOccupied(day, timeIndex, 1, lectureFaculty.faculty_id, availableClassroom.id, entry)
          dailySubjectLectures[day].add(subject.id)
          hoursScheduled++
          subjectWeeklyHours[subject.id] += 1
          
          // Track faculty usage
          facultyUsageCount[lectureFaculty.faculty_id] = (facultyUsageCount[lectureFaculty.faculty_id] || 0) + 1
          
          // Remove this day from available days for this subject
          availableDays.splice(dayIndex, 1)
          if (availableDays.length === 0 && hoursScheduled < weeklyHours) {
            // Reset available days if we need more hours but ran out of days
            availableDays.push(...shuffledDays.filter(d => !dailySubjectLectures[d].has(subject.id)))
          }
        }
      }
      
      // Step 2: Schedule labs and tutorials
      const numberOfBatches = 3
      const batches = Array.from({ length: numberOfBatches }, (_, i) => ({
        number: i + 1,
        name: `${section.name}${i + 1}`
      }))
      
      for (const subject of subjects) {
        // Schedule labs (2 hours each)
        if (subject.has_lab) {
          // Get ALL faculty who can teach this subject's labs
          const qualifiedLabFaculty = facultySubjects.filter(fs => 
            fs.subject_id === subject.id && fs.subject_types?.includes('lab')
          )
          
          if (qualifiedLabFaculty.length > 0) {
            // Select a faculty member with least load
            const labFaculty = qualifiedLabFaculty.reduce((leastUsed, current) => {
              const leastUsedCount = facultyUsageCount[leastUsed.faculty_id] || 0
              const currentCount = facultyUsageCount[current.faculty_id] || 0
              return currentCount < leastUsedCount ? current : leastUsed
            })
            const shuffledBatches = [...batches].sort(() => Math.random() - 0.5)
            
            for (const batch of shuffledBatches) {
              let scheduled = false
              
              // Try different days for each batch
              for (const day of shuffledDays) {
                if (scheduled) break
                
                // Find available classroom - try all classrooms starting from last used index
                let availableClassroom = null
                let timeIndex = null
                
                for (let i = 0; i < labClassrooms.length; i++) {
                  const roomIndexToTry = (labRoomIndex + i) % labClassrooms.length
                  const room = labClassrooms[roomIndexToTry]
                  const slot = findBestTimeSlot(day, 2, labFaculty.faculty_id, room)
                  
                  if (slot !== null) {
                    availableClassroom = room
                    timeIndex = slot
                    labRoomIndex = (roomIndexToTry + 1) % labClassrooms.length
                    break
                  }
                }
                
                if (!availableClassroom || timeIndex === null) continue
                
                const startTime = timeSlots[timeIndex]
                const endTime = timeSlots[timeIndex + 2] || '18:00'
                
                const entry = {
                  section_id: sectionId,
                  subject_id: subject.id,
                  faculty_id: labFaculty.faculty_id,
                  classroom_id: availableClassroom.id,
                  day_of_week: day,
                  start_time: startTime,
                  end_time: endTime,
                  subject_type: 'lab',
                  batch_number: batch.number
                }
                
                timetableEntries.push(entry)
                markSlotOccupied(day, timeIndex, 2, labFaculty.faculty_id, availableClassroom.id, entry)
                
                // Track faculty usage
                facultyUsageCount[labFaculty.faculty_id] = (facultyUsageCount[labFaculty.faculty_id] || 0) + 2
                scheduled = true
              }
            }
          }
        }
        
        // Schedule tutorials (1 hour each, batch-wise)
        if (subject.has_tutorial) {
          // Get ALL faculty who can teach this subject's tutorials
          const qualifiedTutorialFaculty = facultySubjects.filter(fs => 
            fs.subject_id === subject.id && fs.subject_types?.includes('tutorial')
          )
          
          if (qualifiedTutorialFaculty.length > 0) {
            // Select a faculty member with least load
            const tutorialFaculty = qualifiedTutorialFaculty.reduce((leastUsed, current) => {
              const leastUsedCount = facultyUsageCount[leastUsed.faculty_id] || 0
              const currentCount = facultyUsageCount[current.faculty_id] || 0
              return currentCount < leastUsedCount ? current : leastUsed
            })
            const shuffledBatches = [...batches].sort(() => Math.random() - 0.5)
            
            // Schedule tutorial for each batch separately
            for (const batch of shuffledBatches) {
              let scheduled = false
              
              // Try different days for each batch
              for (const day of shuffledDays) {
                if (scheduled) break
                
                // Find available classroom - try all classrooms starting from last used index
                let availableClassroom = null
                let timeIndex = null
                
                for (let i = 0; i < tutorialClassrooms.length; i++) {
                  const roomIndexToTry = (tutorialRoomIndex + i) % tutorialClassrooms.length
                  const room = tutorialClassrooms[roomIndexToTry]
                  const slot = findBestTimeSlot(day, 1, tutorialFaculty.faculty_id, room)
                  
                  if (slot !== null) {
                    availableClassroom = room
                    timeIndex = slot
                    tutorialRoomIndex = (roomIndexToTry + 1) % tutorialClassrooms.length
                    break
                  }
                }
                
                if (!availableClassroom || timeIndex === null) continue
                
                const startTime = timeSlots[timeIndex]
                const endTime = timeSlots[timeIndex + 1] || '18:00'
                
                const entry = {
                  section_id: sectionId,
                  subject_id: subject.id,
                  faculty_id: tutorialFaculty.faculty_id,
                  classroom_id: availableClassroom.id,
                  day_of_week: day,
                  start_time: startTime,
                  end_time: endTime,
                  subject_type: 'tutorial',
                  batch_number: batch.number
                }
                
                timetableEntries.push(entry)
                markSlotOccupied(day, timeIndex, 1, tutorialFaculty.faculty_id, availableClassroom.id, entry)
                
                // Track faculty usage
                facultyUsageCount[tutorialFaculty.faculty_id] = (facultyUsageCount[tutorialFaculty.faculty_id] || 0) + 1
                scheduled = true
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
        description: `Generated ${data.length} classes. Schedule respects weekly hour limits and varies start times.`,
      })
    },
    onError: (error) => {
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

  const getTimetableCell = (day, time) => {
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

  const getSubjectTypeBadge = (type) => {
    const variants = {
      lecture: { variant: "default", icon: "📚", color: "bg-primary/10 text-primary border-primary/20" },
      lab: { variant: "secondary", icon: "🔬", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      tutorial: { variant: "outline", icon: "📝", color: "bg-green-500/10 text-green-600 border-green-500/20" }
    }
    
    const config = variants[type]
    if (!config) return null
    
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const MobileTimeSlotCard = ({ day, entries }) => (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {dayLabels[day]}
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

  if (sectionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (sectionsError || timetableError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading data: {(sectionsError || timetableError)?.message}
        </AlertDescription>
      </Alert>
    )
  }

  const activeTimeSlots = getActiveTimeSlots()

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Book className="h-6 w-6" />
            Timetable Management
          </h1>
          <p className="text-muted-foreground">View and generate class schedules</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Select
            value={selectedSection}
            onValueChange={setSelectedSection}
          >
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent>
              {sections?.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name} - Year {section.year_level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSection && (
            <Button 
              onClick={() => generateTimetableMutation.mutate(selectedSection)}
              disabled={generateTimetableMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateTimetableMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Timetable
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Timetable Content */}
      {selectedSection ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-6 border-b">
                    <div className="p-4 border-r bg-muted/50">
                      <div className="font-medium text-sm">Time</div>
                    </div>
                    {daysOfWeek.map(day => (
                      <div key={day} className="p-4 border-r last:border-r-0 bg-muted/50">
                        <div className="font-medium text-sm text-center">{dayLabels[day]}</div>
                      </div>
                    ))}
                  </div>

                  {activeTimeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-6 border-b last:border-b-0">
                      <div className="p-2 border-r bg-muted/30 flex items-center">
                        <div className="font-mono text-xs">{time}</div>
                      </div>
                      
                      {daysOfWeek.map(day => {
                        const entries = getTimetableCell(day, time)
                        return (
                          <div key={`${day}-${time}`} className="p-1 border-r last:border-r-0 min-h-[60px]">
                            {entries.length > 0 && (
                              <div className="space-y-1">
                                {entries.map((entry, index) => (
                                  <div
                                    key={index}
                                    className="bg-card border rounded-lg p-2 text-xs space-y-1 shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">{entry.subjects?.code}</div>
                                      {getSubjectTypeBadge(entry.subject_type)}
                                    </div>
                                    <div className="text-muted-foreground truncate">{entry.subjects?.name}</div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{entry.faculty?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      <span>{entry.classrooms?.name}</span>
                                    </div>
                                    {entry.batch_number && (
                                      <Badge variant="outline" className="text-xs w-fit">
                                        Batch {entry.batch_number}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {daysOfWeek.map(day => {
                const dayEntries = timetable?.filter(entry => entry.day_of_week === day) || []
                return (
                  <MobileTimeSlotCard
                    key={day}
                    day={day}
                    entries={dayEntries}
                  />
                )
              })}
            </div>
          </>
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
