"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSignIcon, WalletIcon } from "lucide-react"

interface DineroCardProps {
  dinero: number
  nombre: string
}

export function DineroCard({ dinero, nombre }: DineroCardProps) {
  const isNegative = dinero < 0
  const isZero = dinero === 0
  
  // Determinar colores basado en el valor
  const cardColors = isNegative 
    ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
    : isZero 
    ? "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
    : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
    
  const titleColor = isNegative ? "text-red-800" : isZero ? "text-gray-800" : "text-green-800"
  const iconColor = isNegative ? "text-red-600" : isZero ? "text-gray-600" : "text-green-600"
  const amountColor = isNegative ? "text-red-900" : isZero ? "text-gray-900" : "text-green-900"
  const subtitleColor = isNegative ? "text-red-700" : isZero ? "text-gray-700" : "text-green-700"
  const bgIconColor = isNegative ? "bg-red-100" : isZero ? "bg-gray-100" : "bg-green-100"

  return (
    <Card className={cardColors}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${titleColor}`}>
          Mi Dinero Disponible
        </CardTitle>
        <WalletIcon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${amountColor}`}>
              ${isNegative ? '-' : ''}${Math.abs(dinero).toLocaleString('es-CL')}
            </div>
            <p className={`text-xs ${subtitleColor} mt-1`}>
              Cuenta de {nombre}
            </p>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 ${bgIconColor} rounded-full`}>
            <DollarSignIcon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}