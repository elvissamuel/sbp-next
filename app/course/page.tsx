"use client"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Search } from "lucide-react"

export default function CourseListPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const courses = [
    {
      id: 1,
      title: "Web Development Fundamentals",
      description: "Learn the basics of HTML, CSS, and JavaScript",
      banner: "https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=400&h=200&fit=crop",
      students: 1234,
      rating: 4.8,
    },
    {
      id: 2,
      title: "React Advanced Patterns",
      description: "Master advanced React patterns and best practices",
      banner: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop",
      students: 892,
      rating: 4.9,
    },
    {
      id: 3,
      title: "Machine Learning Basics",
      description: "Introduction to ML concepts and algorithms",
      banner: "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=400&h=200&fit=crop",
      students: 567,
      rating: 4.7,
    },
  ]

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Browse Courses</h1>
          <p className="text-muted-foreground">Explore our selection of courses</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={course.banner || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{course.students} students</span>
                    <span>⭐ {course.rating}</span>
                  </div>
                  <Button className="w-full">Enroll Now</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No courses found matching "{searchQuery}"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
