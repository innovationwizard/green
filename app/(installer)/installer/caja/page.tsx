'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCashBoxBalance, CashBoxMovement } from '@/lib/cash-box/calculations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MiCajaPage() {
  const [balance, setBalance] = useState<number>(0)
  const [movements, setMovements] = useState<CashBoxMovement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCashBox()
  }, [])

  async function loadCashBox() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const result = await getCashBoxBalance(user.id)
    setBalance(result.balance)
    setMovements(result.movements)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  const isNegative = balance < 0

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Mi Caja</h1>

      <Card>
        <CardHeader>
          <CardTitle>Balance Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${isNegative ? 'text-destructive' : 'text-primary'}`}>
            Q {Math.abs(balance).toFixed(2)}
          </div>
          {isNegative && (
            <p className="text-sm text-destructive mt-2">
              Advertencia: Tu caja tiene un balance negativo
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay movimientos aún
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex justify-between items-start pb-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{movement.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(movement.created_at), "d 'de' MMM, yyyy 'a las' HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                  <div
                    className={`font-semibold ${
                      movement.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {movement.amount >= 0 ? '+' : ''}Q {Math.abs(movement.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

