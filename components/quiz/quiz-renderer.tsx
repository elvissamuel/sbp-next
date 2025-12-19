"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface Question {
  id: string
  question: string
  type: "multipleChoice" | "multipleSelect" | "trueOrFalse" | "typeAnswer"
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
}

interface QuizRendererProps {
  questions: Question[]
  title?: string
  onComplete?: (score: number) => void
}

export function QuizRenderer({ questions, title = "Quiz", onComplete }: QuizRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [showResults, setShowResults] = useState(false)

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleAnswer = (answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      calculateResults()
    }
  }

  const calculateResults = () => {
    let correct = 0
    questions.forEach((q) => {
      const userAnswer = answers[q.id]
      if (typeof q.correctAnswer === "string") {
        if (userAnswer === q.correctAnswer) correct++
      } else {
        if (JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer)) correct++
      }
    })
    const score = (correct / questions.length) * 100
    setShowResults(true)
    onComplete?.(score)
  }

  if (showResults) {
    return <QuizResults questions={questions} answers={answers} />
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
          {currentQuestion.explanation && <CardDescription>{currentQuestion.explanation}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.type === "multipleChoice" && (
            <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="font-normal cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {currentQuestion.type === "trueOrFalse" && (
            <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {["True", "False"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="font-normal cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {currentQuestion.type === "typeAnswer" && (
            <Input
              type="text"
              placeholder="Type your answer..."
              value={(answers[currentQuestion.id] as string) || ""}
              onChange={(e) => handleAnswer(e.target.value)}
            />
          )}

          {currentQuestion.type === "multipleSelect" && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={(answers[currentQuestion.id] as string[])?.includes(option) || false}
                    onCheckedChange={(checked) => {
                      const current = (answers[currentQuestion.id] as string[]) || []
                      if (checked) {
                        handleAnswer([...current, option])
                      } else {
                        handleAnswer(current.filter((a) => a !== option))
                      }
                    }}
                  />
                  <Label htmlFor={option} className="font-normal cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button onClick={handleNext} className="flex-1">
          {currentIndex === questions.length - 1 ? "Submit Quiz" : "Next"}
        </Button>
      </div>
    </div>
  )
}

function QuizResults({ questions, answers }: { questions: Question[]; answers: Record<string, any> }) {
  let correct = 0
  questions.forEach((q) => {
    const userAnswer = answers[q.id]
    if (typeof q.correctAnswer === "string") {
      if (userAnswer === q.correctAnswer) correct++
    }
  })
  const score = (correct / questions.length) * 100

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Quiz Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">{score.toFixed(0)}%</div>
          <p className="text-muted-foreground">
            You got {correct} out of {questions.length} questions correct
          </p>
        </div>

        <div className="space-y-4">
          {questions.map((q) => {
            const userAnswer = answers[q.id]
            const isCorrect =
              typeof q.correctAnswer === "string"
                ? userAnswer === q.correctAnswer
                : JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer)

            return (
              <Card key={q.id} className={`border-border/50 ${isCorrect ? "border-green-200" : "border-red-200"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{q.question}</p>
                    <span className={isCorrect ? "text-green-600" : "text-red-600"}>{isCorrect ? "✓" : "✗"}</span>
                  </div>
                  {!isCorrect && (
                    <div>
                      <p className="text-sm text-muted-foreground">Your answer: {userAnswer}</p>
                      <p className="text-sm text-green-600">Correct answer: {q.correctAnswer}</p>
                    </div>
                  )}
                  {q.explanation && <p className="text-sm text-muted-foreground mt-2">{q.explanation}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Button className="w-full">Return to Course</Button>
      </CardContent>
    </Card>
  )
}
