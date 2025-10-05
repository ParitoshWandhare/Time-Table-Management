import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Plus, DoorOpen, Edit2, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type RoomType = "lecture" | "lab" | "tutorial"

export default function Classrooms() {
  const [newClassroom, setNewClassroom] = useState({ name: "", capacity: 60, room_type: "lecture" as RoomType })
  const [editClassroom, setEditClassroom] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: classrooms, isLoading } = useQuery({
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

  const createClassroomMutation = useMutation({
    mutationFn: async (classroomData: { name: string; capacity: number; room_type: RoomType }) => {
      const { data, error } = await supabase
        .from('classrooms')
        .insert([classroomData])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      setNewClassroom({ name: "", capacity: 60, room_type: "lecture" })
      setOpen(false)
      toast({
        title: "Success",
        description: "Classroom added successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  const updateClassroomMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; name: string; capacity: number; room_type: RoomType }) => {
      const { data, error } = await supabase
        .from('classrooms')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      setEditClassroom(null)
      setEditOpen(false)
      toast({
        title: "Success",
        description: "Classroom updated successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  const deleteClassroomMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      toast({
        title: "Success",
        description: "Classroom deleted successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassroom.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter classroom name",
        variant: "destructive",
      })
      return
    }
    createClassroomMutation.mutate(newClassroom)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editClassroom?.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter classroom name",
        variant: "destructive",
      })
      return
    }
    updateClassroomMutation.mutate(editClassroom)
  }

  const getRoomTypeBadgeColor = (roomType: string) => {
    switch (roomType) {
      case 'lecture':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      case 'lab':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
      case 'tutorial':
        return 'bg-green-500/10 text-green-700 dark:text-green-300'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Classroom Management</h1>
          <p className="text-muted-foreground">Manage classrooms and their types</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Classroom</DialogTitle>
              <DialogDescription>
                Enter the details of the new classroom.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name</Label>
                <Input
                  id="name"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  placeholder="e.g., Room 101, Lab A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newClassroom.capacity}
                  onChange={(e) => setNewClassroom({ ...newClassroom, capacity: parseInt(e.target.value) || 60 })}
                  placeholder="Enter capacity"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type</Label>
                <Select
                  value={newClassroom.room_type}
                  onValueChange={(value: RoomType) => setNewClassroom({ ...newClassroom, room_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture Hall</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="tutorial">Tutorial Room</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Room type determines what can be scheduled: Lecture halls for lectures, Labs for lab sessions, Tutorial rooms for tutorials.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={createClassroomMutation.isPending}>
                {createClassroomMutation.isPending ? "Adding..." : "Add Classroom"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Classroom</DialogTitle>
              <DialogDescription>
                Update the classroom details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Classroom Name</Label>
                <Input
                  id="edit-name"
                  value={editClassroom?.name || ""}
                  onChange={(e) => setEditClassroom({ ...editClassroom, name: e.target.value })}
                  placeholder="e.g., Room 101, Lab A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={editClassroom?.capacity || 60}
                  onChange={(e) => setEditClassroom({ ...editClassroom, capacity: parseInt(e.target.value) || 60 })}
                  placeholder="Enter capacity"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room_type">Room Type</Label>
                <Select
                  value={editClassroom?.room_type || "lecture"}
                  onValueChange={(value: RoomType) => setEditClassroom({ ...editClassroom, room_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture Hall</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="tutorial">Tutorial Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updateClassroomMutation.isPending}>
                {updateClassroomMutation.isPending ? "Updating..." : "Update Classroom"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {classrooms?.map((classroom) => (
          <Card key={classroom.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <DoorOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg truncate">{classroom.name}</CardTitle>
                  <CardDescription>
                    Capacity: {classroom.capacity} students
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Room Type:</Label>
                <Badge className={`mt-1 ${getRoomTypeBadgeColor(classroom.room_type)} capitalize`}>
                  {classroom.room_type}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditClassroom(classroom)
                    setEditOpen(true)
                  }}
                  className="flex-1"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {classroom.name}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteClassroomMutation.mutate(classroom.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classrooms?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No classrooms yet. Click "Add Classroom" to create one.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}