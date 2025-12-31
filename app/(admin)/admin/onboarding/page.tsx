'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle } from 'lucide-react'

type Step = 'admin' | 'installers' | 'catalog' | 'rates' | 'project' | 'quote'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('admin')
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())

  const steps: Array<{ id: Step; title: string; description: string }> = [
    { id: 'admin', title: 'Crear Admin y Manager', description: 'Configurar usuarios administrativos' },
    { id: 'installers', title: 'Agregar Instaladores', description: 'Crear roster de instaladores' },
    { id: 'catalog', title: 'Catálogo de Items', description: 'Importar o crear catálogo de materiales' },
    { id: 'rates', title: 'Tarifas de Mano de Obra', description: 'Configurar tarifas por instalador' },
    { id: 'project', title: 'Crear Primer Proyecto', description: 'Crear tu primer proyecto' },
    { id: 'quote', title: 'Importar Primera Cotización', description: 'Importar cotización del proyecto' },
  ]

  function markStepComplete(step: Step) {
    setCompletedSteps(new Set([...completedSteps, step]))
    const currentIndex = steps.findIndex((s) => s.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Configuración Inicial</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-6">
        {steps.map((step) => {
          const isCompleted = completedSteps.has(step.id)
          const isCurrent = currentStep === step.id
          const Icon = isCompleted ? CheckCircle : Circle

          return (
            <div
              key={step.id}
              className={`p-3 border rounded text-center cursor-pointer ${
                isCurrent ? 'border-primary bg-primary/5' : ''
              } ${isCompleted ? 'border-green-500' : ''}`}
              onClick={() => setCurrentStep(step.id)}
            >
              <Icon
                className={`w-6 h-6 mx-auto mb-2 ${
                  isCompleted ? 'text-green-600' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <div className="text-xs font-medium">{step.title}</div>
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps.find((s) => s.id === currentStep)?.title}</CardTitle>
          <CardDescription>
            {steps.find((s) => s.id === currentStep)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 'admin' && (
            <AdminStep onComplete={() => markStepComplete('admin')} />
          )}
          {currentStep === 'installers' && (
            <InstallersStep onComplete={() => markStepComplete('installers')} />
          )}
          {currentStep === 'catalog' && (
            <CatalogStep onComplete={() => markStepComplete('catalog')} />
          )}
          {currentStep === 'rates' && (
            <RatesStep onComplete={() => markStepComplete('rates')} />
          )}
          {currentStep === 'project' && (
            <ProjectStep onComplete={() => markStepComplete('project')} />
          )}
          {currentStep === 'quote' && (
            <QuoteStep onComplete={() => markStepComplete('quote')} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AdminStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Los usuarios admin y manager deben crearse desde Supabase Auth primero,
        luego actualizar sus roles en la base de datos.
      </p>
      <Button onClick={onComplete}>Continuar</Button>
    </div>
  )
}

function InstallersStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Ve a la sección de Usuarios para agregar instaladores.
      </p>
      <Button onClick={onComplete}>Continuar</Button>
    </div>
  )
}

function CatalogStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Ve a la sección de Items para crear o importar el catálogo.
      </p>
      <Button onClick={onComplete}>Continuar</Button>
    </div>
  )
}

function RatesStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Ve a la sección de Tarifas para configurar las tarifas de mano de obra.
      </p>
      <Button onClick={onComplete}>Continuar</Button>
    </div>
  )
}

function ProjectStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Ve a la sección de Proyectos para crear tu primer proyecto.
      </p>
      <Button onClick={onComplete}>Continuar</Button>
    </div>
  )
}

function QuoteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Ve a la sección de Importar Cotización para importar la primera cotización.
      </p>
      <Button onClick={onComplete}>Finalizar Configuración</Button>
    </div>
  )
}

