"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Gift, Sparkles, Heart, Copy, Check, Lock, Eye, EyeOff } from "lucide-react"

export default function Home() {
  const [name, setName] = useState("")
  const [secretFriend, setSecretFriend] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const isSubmitting = useRef(false) // Verrou pour éviter les soumissions multiples

  // Compteur de 10 secondes avant de cacher automatiquement
  useEffect(() => {
    if (showResult && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (countdown === 0 && showResult) {
      // Réinitialiser complètement après 10 secondes
      handleAutoReset()
    }
  }, [countdown, showResult])

  const handleAutoReset = () => {
    setName("")
    setSecretFriend(null)
    setShowResult(false)
    setError(null)
    setCopied(false)
    setIsRevealed(false)
    setCountdown(10)
  }

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Verrou: empêcher les soumissions multiples
    if (isSubmitting.current) {
      console.log("⚠️ Soumission déjà en cours, ignorée")
      return
    }
    
    isSubmitting.current = true
    setIsLoading(true)
    setError(null)
    setSecretFriend(null)
    setShowResult(false)
    setIsRevealed(false)

    const supabase = createClient()

    try {
      const trimmedName = name.trim()

      // ÉTAPE 1: Vérifier si l'étudiant existe dans la table students
      const { data: studentExists, error: studentCheckError } = await supabase
        .from("students")
        .select("name")
        .ilike("name", `%${trimmedName}%`)
        .limit(10)

      if (studentCheckError || !studentExists || studentExists.length === 0) {
        setError("Nom non trouvé dans la liste des étudiants. Vérifiez l'orthographe.")
        setIsLoading(false)
        return
      }

      // Si plusieurs résultats trouvés, demander de préciser
      if (studentExists.length > 1) {
        const names = studentExists.map(s => s.name).join(", ")
        setError(`Plusieurs étudiants trouvés. Soyez plus précis.`)
        setIsLoading(false)
        return
      }

      const exactStudentName = studentExists[0].name

      // ÉTAPE 2: Vérifier si CET ÉTUDIANT a déjà fait son tirage
      const { data: existingAssignment } = await supabase
        .from("assignments")
        .select("secret_friend_name")
        .eq("student_name", exactStudentName)
        .maybeSingle()

      // ⚠️ PROTECTION : Ce nom a déjà tiré son ami secret
      if (existingAssignment) {
        setError("⚠️ Ce nom a déjà un ami secret assigné. Tapez VOTRE nom et gardez le secret ! 🤫")
        setIsLoading(false)
        isSubmitting.current = false // Libérer le verrou
        return
      }

      // ÉTAPE 3: Nouveau tirage pour cet étudiant
      const { data: allStudents, error: studentsError } = await supabase
        .from("students")
        .select("name")

      if (studentsError || !allStudents || allStudents.length === 0) {
        setError("Impossible de récupérer la liste des étudiants.")
        setIsLoading(false)
        return
      }

      // Récupérer les amis secrets déjà assignés
      const { data: alreadyAssigned } = await supabase
        .from("assignments")
        .select("secret_friend_name")

      const assignedNames = new Set(alreadyAssigned?.map(a => a.secret_friend_name) || [])

      // Filtrer les étudiants disponibles
      let availableStudents = allStudents
        .map(s => s.name)
        .filter(studentName => 
          !assignedNames.has(studentName) &&
          studentName !== exactStudentName
        )

      // Cas limite: permettre les doublons si nécessaire
      if (availableStudents.length === 0) {
        availableStudents = allStudents
          .map(s => s.name)
          .filter(studentName => studentName !== exactStudentName)
      }

      if (availableStudents.length === 0) {
        setError("Plus d'amis secrets disponibles. Contactez l'administrateur.")
        setIsLoading(false)
        return
      }

      // TIRAGE ALÉATOIRE
      const randomIndex = Math.floor(Math.random() * availableStudents.length)
      const selectedSecretFriend = availableStudents[randomIndex]

      // ÉTAPE 4: Enregistrer l'assignation (UNE SEULE FOIS)
      const { error: insertError } = await supabase
        .from("assignments")
        .insert({
          student_name: exactStudentName,
          secret_friend_name: selectedSecretFriend
        })

      if (insertError) {
        console.error("Erreur insertion:", insertError)
        setError("Erreur lors de l'enregistrement du tirage.")
        setIsLoading(false)
        return
      }

      // ÉTAPE 5: Afficher le résultat avec animation
      setTimeout(() => {
        setSecretFriend(selectedSecretFriend)
        setShowResult(true)
        setIsLoading(false)
        isSubmitting.current = false // Libérer le verrou
        setCountdown(10) // Démarrer le compte à rebours
      }, 1500)

    } catch (err) {
      console.error("Erreur:", err)
      setError("Une erreur s'est produite. Veuillez réessayer.")
      setIsLoading(false)
      isSubmitting.current = false // Libérer le verrou même en cas d'erreur
    }
  }

  const handleCopy = async () => {
    if (secretFriend) {
      await navigator.clipboard.writeText(secretFriend)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleReveal = () => {
    setIsRevealed(!isRevealed)
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
                    Entre TON nom (complet ou partiel)
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: NOMO ou NATHANIEL"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-base"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Tape uniquement TON nom. Ne cherche pas les amis des autres !
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">{error}</p>
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

              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed">
                    Ton ami imaginaire sera tiré au sort lors de ta première recherche. 
                    <strong> Tu ne pourras le voir qu'UNE SEULE FOIS</strong>, alors note-le bien !
                  </p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium text-center">
                    🤫 Garde le secret ! Ne cherche pas les amis des autres.
                  </p>
                </div>
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
              <CardTitle className="text-2xl font-bold text-foreground">
                Ton ami imaginaire est...
              </CardTitle>
              <div className="text-sm text-amber-600 font-medium bg-amber-50 py-2 px-4 rounded-lg">
                ⏱️ Cette page se fermera dans {countdown} secondes
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
                {!isRevealed ? (
                  <div className="text-center">
                    <Button
                      onClick={toggleReveal}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Cliquer pour révéler
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text leading-relaxed">
                      {secretFriend}
                    </p>
                    <Button
                      onClick={toggleReveal}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Masquer
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleCopy} 
                  variant="outline" 
                  className="flex-1 h-11 bg-transparent" 
                  disabled={copied || !isRevealed}
                >
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
              </div>

              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  🎁 Note bien ce nom, tu ne pourras plus le voir après !
                </p>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-medium text-center">
                    ⚠️ GARDE LE SECRET ! Ne partage pas ton ami imaginaire avec les autres.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
