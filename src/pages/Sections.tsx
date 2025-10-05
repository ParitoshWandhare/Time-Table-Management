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
import { Plus, School, Users, Edit2, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type YearLevel = "FY" | "SY" | "TY" | "Final Year"

const yearLevels: YearLevel[] = ['FY', 'SY', 'TY', 'Final Year']

interface SectionData {
  name: string
  year_level: YearLevel
  student_count: number
}

export default function Sections() {
  const [newSection, setNewSection] = useState<SectionData>({
    name: "",
    year_level: "FY",  // Default to valid enum value
    student_count: 60
  })
  const [editSection, setEditSection] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  const createSectionMutation = useMutation({
    mutationFn: async (sectionData: SectionData) => {
      const { data, error } = await supabase
        .from('sections')
        .insert([sectionData])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      setNewSection({
        name: "",
        year_level: "FY",
        student_count: 60
      })
      setOpen(false)
      toast({
        title: "Success",
        description: "Section added successfully",
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

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: any) => {
      const { data, error } = await supabase
        .from('sections')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      setEditSection(null)
      setEditOpen(false)
      toast({
        title: "Success",
        description: "Section updated successfully",
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

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      toast({
        title: "Success",
        description: "Section deleted successfully",
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
    if (!newSection.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    createSectionMutation.mutate(newSection)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSection?.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    updateSectionMutation.mutate(editSection)
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

  const getBatchInfo = (studentCount: number) => {
    const batchSize = Math.ceil(studentCount / 3)
    return {
      totalBatches: 3,
      batchSize: batchSize,
      batches: [
        { name: 'Batch A', size: Math.min(batchSize, studentCount) },
        { name: 'Batch B', size: Math.min(batchSize, Math.max(0, studentCount - batchSize)) },
        { name: 'Batch C', size: Math.max(0, studentCount - (2 * batchSize)) }
      ].filter(batch => batch.size > 0)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Section Management</h1>
          <p className="text-muted-foreground">Manage student sections and batch divisions for labs and tutorials</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Section</DialogTitle>
              <DialogDescription>
                Create a new student section. Each section will be automatically divided into 3 batches for lab sessions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Section Name</Label>
                  <Input
                    id="name"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                    placeholder="e.g., A, B, C"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Select 
                    value={newSection.year_level} 
                    onValueChange={(value: YearLevel) => setNewSection({ ...newSection, year_level: value })}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="student_count">Number of Students</Label>
                <Input
                  id="student_count"
                  type="number"
                  min="10"
                  max="120"
                  value={newSection.student_count}
                  onChange={(e) => setNewSection({ ...newSection, student_count: parseInt(e.target.value) || 60 })}
                />
                <p className="text-xs text-muted-foreground">
                  Students will be divided into 3 batches for lab sessions
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={createSectionMutation.isPending}>
                {createSectionMutation.isPending ? "Adding..." : "Add Section"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>
                Update the section details. Note that changing student count will affect batch divisions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Section Name</Label>
                  <Input
                    id="edit-name"
                    value={editSection?.name || ""}
                    onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                    placeholder="e.g., A, B, C"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-year_level">Year Level</Label>
                  <Select 
                    value={editSection?.year_level || "FY"} 
                    onValueChange={(value: YearLevel) => setEditSection({ ...editSection, year_level: value })}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-student_count">Number of Students</Label>
                <Input
                  id="edit-student_count"
                  type="number"
                  min="10"
                  max="120"
                  value={editSection?.student_count || 60}
                  onChange={(e) => setEditSection({ ...editSection, student_count: parseInt(e.target.value) || 60 })}
                />
                <p className="text-xs text-muted-foreground">
                  Students will be divided into 3 batches for lab sessions
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={updateSectionMutation.isPending}>
                {updateSectionMutation.isPending ? "Updating..." : "Update Section"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections?.map((section) => {
          const batchInfo = getBatchInfo(section.student_count)
          
          return (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Section {section.name}</CardTitle>
                      <CardDescription>{section.year_level}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={getYearBadgeVariant(section.year_level)}>
                    {section.year_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{section.student_count} students</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Lab Batches:</Label>
                    <div className="flex flex-wrap gap-1">
                      {batchInfo.batches.map((batch, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {batch.name} ({batch.size})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditSection(section)
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
                            This will permanently delete Section {section.name} and all related timetable entries.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSectionMutation.mutate(section.id)}
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
          )
        })}
      </div>

      {sections?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <School className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Sections</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first student section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}