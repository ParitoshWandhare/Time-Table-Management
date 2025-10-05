import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Faculty from "./pages/Faculty";
import Subjects from "./pages/Subjects";
import Sections from "./pages/Sections";
import Classrooms from "./pages/Classrooms";
import Timetable from "./pages/Timetable";
import FacultyTimetable from "./pages/FacultyTimetable";
import ClassroomTimetable from "./pages/ClassroomTimetable";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/faculty" element={<Faculty />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/sections" element={<Sections />} />
              <Route path="/classrooms" element={<Classrooms />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/faculty-timetable" element={<FacultyTimetable />} />
              <Route path="/classroom-timetable" element={<ClassroomTimetable />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
