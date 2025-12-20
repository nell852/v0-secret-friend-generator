"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Gift, Sparkles, Heart, Copy, Check } from "lucide-react"

// Fonction pour mélanger un tableau (algorithme Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Fonction pour créer un tirage circulaire (chacun offre à quelqu'un)
function createSecretSantaAssignments(students: string[]): Map<string, string> {
  const shuffled = shuffleArray(students)
  const assignments = new Map<string, string>()
  
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i]
    const receiver = shuffled[(i + 1) % shuffled.length] // Circulaire
    assignments.set(giver, receiver)
  }
  
  return assignments
}

export default function Home() {
  const [name, setName] = useState("")
  const [secretFriend, setSecretFriend] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSecretFriend(null)
    setShowResult(false)

    const supabase = createClient()

    try {
      // 1. Vérifier si des assignations existent déjà
      const { data: existingAssignments, error: checkError } = await supabase
        .from("assignments")
        .select("student_name, secret_friend_name")
        .limit(1)

      if (checkError) throw checkError

      // 2. Si aucune assignation n'existe, faire le tirage automatique
      if (!existingAssignments || existingAssignments.length === 0) {
        console.log("Aucune assignation trouvée. Lancement du tirage automatique...")

        // Récupérer tous les étudiants (supposons qu'il y a une table 'students')
        // Ou vous pouvez avoir une liste hardcodée
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("name")

        if (studentsError || !students || students.length === 0) {
          setError("Impossible de récupérer la liste des étudiants.")
          setIsLoading(false)
          return
        }

        // Créer les assignations aléatoires
        const studentNames = students.map(s => s.name)
        const assignments = createSecretSantaAssignments(studentNames)

        // Préparer les données à insérer
        const assignmentsData = Array.from(assignments.entries()).map(([student, secret]) => ({
          student_name: student,
          secret_friend_name: secret
        }))

        // Insérer toutes les assignations en BD
        const { error: insertError } = await supabase
          .from("assignments")
          .insert(assignmentsData)

        if (insertError) {
          console.error("Erreur lors de l'insertion:", insertError)
          setError("Erreur lors de la création du tirage.")
          setIsLoading(false)
          return
        }

        console.log("Tirage automatique complété avec succès!")
      }

      // 3. Chercher l'assignation de l'étudiant
      const { data, error: fetchError } = await supabase
        .from("assignments")
        .select("secret_friend_name")
        .ilike("student_name", name.trim())
        .single()

      if (fetchError || !data) {
        setError("Nom non trouvé. Vérifiez l'orthographe et réessayez.")
        setIsLoading(false)
        return
      }

      // Simuler un suspense avec délai d'animation
      setTimeout(() => {
        setSecretFriend(data.secret_friend_name)
        setShowResult(true)
        setIsLoading(false)
      }, 1500)
    } catch (err) {
      console.error("Erreur:", err)
      setError("Une erreur s'est produite. Veuillez réessayer.")
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (secretFriend) {
      await navigator.clipboard.writeText(secretFriend)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setName("")
    setSecretFriend(null)
    setShowResult(false)
    setError(null)
    setCopied(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      <div className="w-full max-w-md">
        {!showResult ? (
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <Gift className="h-16 w-16 text-pink-500" />
                  <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Les Amis Imaginaires
              </CardTitle>
              <CardDescription className="text-lg font-medium text-foreground/80">B3 Jour</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReveal} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium">
                    Entre ton nom complet
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: NOMO BELLA NATHANIEL MARC PHILIPPE GEOVANI"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-base"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Tape tes noms et prénoms en lettres Majuscules</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 animate-spin" />
                      Révélation en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Découvrir mon ami imaginaire
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chaque étudiant a été assigné à un ami imaginaire de manière aléatoire et sécurisée. Tu ne peux voir
                  que ton propre ami imaginaire.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 shadow-xl animate-in fade-in duration-500">
            <CardHeader className="text-center space-y-3">
              <div className="flex justify-center mb-2">
                <div className="relative animate-bounce">
                  <Heart className="h-20 w-20 text-pink-500 fill-pink-500" />
                  <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Ton ami imaginaire est...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
                <p className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text leading-relaxed">
                  {secretFriend}
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleCopy} variant="outline" className="flex-1 h-11 bg-transparent" disabled={copied}>
                  {copied ? (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Copié!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copier le nom
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  className="flex-1 h-11 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  Nouvelle recherche
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Fais un beau cadeau à ton ami imaginaire et garde cette information secrète!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
