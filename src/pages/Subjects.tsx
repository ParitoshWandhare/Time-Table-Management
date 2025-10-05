import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Plus, Book, Clock, FlaskConical, Users, Edit2, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type YearLevel = "FY" | "SY" | "TY" | "Final Year"

const yearLevels: YearLevel[] = ['FY', 'SY', 'TY', 'Final Year']

interface SubjectData {
  name: string
  code: string
  year_level: YearLevel
  weekly_hours: number
  has_lab: boolean
  has_tutorial: boolean
}

export default function Subjects() {
  const [newSubject, setNewSubject] = useState<SubjectData>({
    name: "",
    code: "",
    year_level: "FY", // ✅ Fixed: Default to valid enum value
    weekly_hours: 3,
    has_lab: false,
    has_tutorial: false
  })
  const [editSubject, setEditSubject] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const createSubjectMutation = useMutation({
    mutationFn: async (subjectData: SubjectData) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert([subjectData])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setNewSubject({
        name: "",
        code: "",
        year_level: "FY",
        weekly_hours: 3,
        has_lab: false,
        has_tutorial: false
      })
      setOpen(false)
      toast({
        title: "Success",
        description: "Subject added successfully",
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

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: any) => {
      const { data, error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setEditSubject(null)
      setEditOpen(false)
      toast({
        title: "Success",
        description: "Subject updated successfully",
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

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast({
        title: "Success",
        description: "Subject deleted successfully",
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
    if (!newSubject.name.trim() || !newSubject.code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    createSubjectMutation.mutate(newSubject)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSubject?.name.trim() || !editSubject?.code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    updateSubjectMutation.mutate(editSubject)
  }

  const getYearBadgeVariant = (year: string) => {
    switch (year) {
      case 'FY': return 'default'
      case 'SY': return 'secondary'
      case 'TY': return 'outline'
      case 'Final Year': return 'destructive'
      default: return 'default'
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subject Management</h1>
          <p className="text-muted-foreground">Configure subjects, weekly hours, and lab/tutorial requirements</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Enter the subject details including weekly hours and session types.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g., Mathematics I"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Subject Code</Label>
                  <Input
                    id="code"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MATH101"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Select 
                    value={newSubject.year_level} 
                    onValueChange={(value: YearLevel) => setNewSubject({ ...newSubject, year_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearLevels.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly_hours">Weekly Hours</Label>
                  <Input
                    id="weekly_hours"
                    type="number"
                    min="1"
                    max="8"
                    value={newSubject.weekly_hours}
                    onChange={(e) => setNewSubject({ ...newSubject, weekly_hours: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_lab"
                    checked={newSubject.has_lab}
                    onCheckedChange={(checked) => setNewSubject({ ...newSubject, has_lab: !!checked })}
                  />
                  <Label htmlFor="has_lab">Has Lab Sessions (2 hours each, 3 batches)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_tutorial"
                    checked={newSubject.has_tutorial}
                    onCheckedChange={(checked) => setNewSubject({ ...newSubject, has_tutorial: !!checked })}
                  />
                  <Label htmlFor="has_tutorial">Has Tutorial Sessions (1 hour each)</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createSubjectMutation.isPending}>
                {createSubjectMutation.isPending ? "Adding..." : "Add Subject"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>
                Update the subject details including weekly hours and session types.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Subject Name</Label>
                  <Input
                    id="edit-name"
                    value={editSubject?.name || ""}
                    onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                    placeholder="e.g., Mathematics I"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Subject Code</Label>
                  <Input
                    id="edit-code"
                    value={editSubject?.code || ""}
                    onChange={(e) => setEditSubject({ ...editSubject, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., MATH101"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-year_level">Year Level</Label>
                  <Select 
                    value={editSubject?.year_level || "FY"} 
                    onValueChange={(value: YearLevel) => setEditSubject({ ...editSubject, year_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearLevels.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weekly_hours">Weekly Hours</Label>
                  <Input
                    id="edit-weekly_hours"
                    type="number"
                    min="1"
                    max="8"
                    value={editSubject?.weekly_hours || 3}
                    onChange={(e) => setEditSubject({ ...editSubject, weekly_hours: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-has_lab"
                    checked={editSubject?.has_lab || false}
                    onCheckedChange={(checked) => setEditSubject({ ...editSubject, has_lab: !!checked })}
                  />
                  <Label htmlFor="edit-has_lab">Has Lab Sessions (2 hours each, 3 batches)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-has_tutorial"
                    checked={editSubject?.has_tutorial || false}
                    onCheckedChange={(checked) => setEditSubject({ ...editSubject, has_tutorial: !!checked })}
                  />
                  <Label htmlFor="edit-has_tutorial">Has Tutorial Sessions (1 hour each)</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={updateSubjectMutation.isPending}>
                {updateSubjectMutation.isPending ? "Updating..." : "Update Subject"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects?.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Book className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <CardDescription>{subject.code}</CardDescription>
                  </div>
                </div>
                <Badge variant={getYearBadgeVariant(subject.year_level)}>
                  {subject.year_level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{subject.weekly_hours} hours/week</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {subject.has_lab && (
                    <Badge variant="secondary" className="text-xs">
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Lab
                    </Badge>
                  )}
                  {subject.has_tutorial && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Tutorial
                    </Badge>
                  )}
                  {!subject.has_lab && !subject.has_tutorial && (
                    <Badge variant="outline" className="text-xs">
                      Lecture Only
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditSubject(subject)
                      setEditOpen(true)
                    }}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {subject.name} ({subject.code}).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSubjectMutation.mutate(subject.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjects?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Book className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Subjects</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first subject.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}