'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createEvent } from '@/lib/events/event-service'
import { format } from 'date-fns'
import { Play, Square, Clock } from 'lucide-react'

export default function TemporizadorPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [projectId] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        setElapsed(Math.floor((now.getTime() - startTime.getTime()) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startTime])

  function handleStart() {
    setStartTime(new Date())
    setIsRunning(true)
    setElapsed(0)
  }

  function handleStop() {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  async function handleSaveTimer() {
    if (!projectId) {
      alert('Selecciona un proyecto primero')
      return
    }

    const hours = elapsed / 3600
    await createEvent('LABOR_LOGGED', projectId, {
      hours,
      start_time: startTime?.toISOString(),
      end_time: new Date().toISOString(),
      manual_entry: false,
    })

    alert('Trabajo registrado exitosamente')
    handleStop()
    setElapsed(0)
    setStartTime(null)
  }

  async function handleSaveManual() {
    if (!projectId) {
      alert('Selecciona un proyecto primero')
      return
    }

    const hours = parseFloat(manualHours) + parseFloat(manualMinutes) / 60
    if (isNaN(hours) || hours <= 0) {
      alert('Ingresa horas válidas')
      return
    }

    await createEvent('LABOR_LOGGED', projectId, {
      hours,
      manual_entry: true,
    })

    alert('Trabajo registrado exitosamente')
    setManualHours('')
    setManualMinutes('')
  }

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Temporizador</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Temporizador Activo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-mono font-bold">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
              {String(seconds).padStart(2, '0')}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {startTime && format(startTime, "Iniciado: d 'de' MMM 'a las' HH:mm")}
            </div>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            ) : (
              <>
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  <Square className="w-4 h-4 mr-2" />
                  Detener
                </Button>
                <Button onClick={handleSaveTimer} className="flex-1">
                  Guardar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrada Manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Horas</label>
              <Input
                type="number"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="0"
                min="0"
                step="0.25"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Minutos</label>
              <Input
                type="number"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
              />
            </div>
          </div>
          <Button onClick={handleSaveManual} className="w-full">
            Guardar Entrada Manual
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

