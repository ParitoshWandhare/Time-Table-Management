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
import { Plus, User, Mail, Edit2, Trash2, BookOpen, X } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"

export default function Faculty() {
  const [newFaculty, setNewFaculty] = useState({ name: "", email: "" })
  const [editFaculty, setEditFaculty] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedSubjectTypes, setSelectedSubjectTypes] = useState<string[]>(["lecture"])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: faculty, isLoading } = useQuery({
    queryKey: ['faculty'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty')
        .select(`
          *,
          faculty_subjects (
            id,
            subject_types,
            subjects (id, name, code)
          )
        `)
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const createFacultyMutation = useMutation({
    mutationFn: async (facultyData: { name: string; email: string }) => {
      const { data, error } = await supabase
        .from('faculty')
        .insert([facultyData])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      setNewFaculty({ name: "", email: "" })
      setOpen(false)
      toast({
        title: "Success",
        description: "Faculty member added successfully",
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

  const updateFacultyMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; name: string; email: string }) => {
      const { data, error } = await supabase
        .from('faculty')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      setEditFaculty(null)
      setEditOpen(false)
      toast({
        title: "Success",
        description: "Faculty member updated successfully",
      })
    }
  })

  const deleteFacultyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('faculty')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      toast({
        title: "Success",
        description: "Faculty member deleted successfully",
      })
    }
  })

  const assignSubjectMutation = useMutation({
    mutationFn: async ({ facultyId, subjectId, subjectTypes }: { facultyId: string; subjectId: string; subjectTypes: string[] }) => {
      const { data, error } = await supabase
        .from('faculty_subjects')
        .insert([{ faculty_id: facultyId, subject_id: subjectId, subject_types: subjectTypes }])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      setSelectedSubject("")
      setSelectedSubjectTypes(["lecture"])
      toast({
        title: "Success",
        description: "Subject assigned successfully",
      })
    }
  })

  const removeSubjectMutation = useMutation({
    mutationFn: async (facultySubjectId: string) => {
      const { error } = await supabase
        .from('faculty_subjects')
        .delete()
        .eq('id', facultySubjectId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      toast({
        title: "Success",
        description: "Subject assignment removed successfully",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFaculty.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter faculty name",
        variant: "destructive",
      })
      return
    }
    createFacultyMutation.mutate(newFaculty)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFaculty?.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter faculty name",
        variant: "destructive",
      })
      return
    }
    updateFacultyMutation.mutate(editFaculty)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const handleAssignSubject = (facultyId: string) => {
    if (!selectedSubject) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive",
      })
      return
    }
    if (selectedSubjectTypes.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subject type",
        variant: "destructive",
      })
      return
    }
    assignSubjectMutation.mutate({ facultyId, subjectId: selectedSubject, subjectTypes: selectedSubjectTypes })
  }

  const handleRemoveSubject = (facultySubjectId: string) => {
    removeSubjectMutation.mutate(facultySubjectId)
  }

  const getAvailableSubjects = (facultyMember: any) => {
    const assignedSubjectIds = facultyMember.faculty_subjects?.map((fs: any) => fs.subjects.id) || []
    return subjects?.filter(subject => !assignedSubjectIds.includes(subject.id)) || []
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Faculty Management</h1>
          <p className="text-muted-foreground">Manage faculty members and their subject assignments</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Faculty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Faculty Member</DialogTitle>
              <DialogDescription>
                Enter the details of the new faculty member.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newFaculty.name}
                  onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                  placeholder="Enter faculty name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newFaculty.email}
                  onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createFacultyMutation.isPending}>
                {createFacultyMutation.isPending ? "Adding..." : "Add Faculty"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Faculty Member</DialogTitle>
              <DialogDescription>
                Update the faculty member details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editFaculty?.name || ""}
                  onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })}
                  placeholder="Enter faculty name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email (Optional)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFaculty?.email || ""}
                  onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateFacultyMutation.isPending}>
                {updateFacultyMutation.isPending ? "Updating..." : "Update Faculty"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {faculty?.map((member) => {
          const availableSubjects = getAvailableSubjects(member)
          return (
            <Card key={member.id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{member.name}</CardTitle>
                    {member.email && (
                      <CardDescription className="flex items-center mt-1">
                        <Mail className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Assigned Subjects:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {member.faculty_subjects?.length > 0 ? (
                      member.faculty_subjects.map((fs: any) => (
                        <div key={fs.id} className="space-y-1">
                          <Badge 
                            variant="secondary" 
                            className="text-xs flex items-center gap-1"
                          >
                            {fs.subjects.code}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive/20"
                              onClick={() => handleRemoveSubject(fs.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                            {fs.subject_types?.map((type: string) => (
                              <span key={type} className="bg-muted px-1 rounded capitalize">
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No subjects assigned</p>
                    )}
                  </div>
                </div>

                {availableSubjects.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Assign Subject:</Label>
                    <div className="space-y-2">
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.code} - {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Subject Types:</Label>
                        <div className="flex flex-wrap gap-2">
                          {["lecture", "lab", "tutorial"].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${type}-${member.id}`}
                                checked={selectedSubjectTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSubjectTypes([...selectedSubjectTypes, type])
                                  } else {
                                    setSelectedSubjectTypes(selectedSubjectTypes.filter(t => t !== type))
                                  }
                                }}
                              />
                              <Label 
                                htmlFor={`${type}-${member.id}`} 
                                className="text-xs capitalize cursor-pointer"
                              >
                                {type}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAssignSubject(member.id)}
                        disabled={!selectedSubject || selectedSubjectTypes.length === 0 || assignSubjectMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Subject
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditFaculty(member)
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
                          This will permanently delete {member.name} and remove them from all subject assignments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteFacultyMutation.mutate(member.id)}
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
          )
        })}
      </div>

      {faculty?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Faculty Members</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Get started by adding your first faculty member to manage subject assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}