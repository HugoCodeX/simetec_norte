"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon } from "lucide-react"

interface DeleteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; name: string } | null
  onConfirm: (userId: string) => void
  isLoading?: boolean
}

export function DeleteUserModal({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading = false,
}: DeleteUserModalProps) {
  const handleConfirm = () => {
    if (user) {
      onConfirm(user.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            ¿Estás seguro de que quieres eliminar al usuario{" "}
            <span className="font-semibold">"{user?.name}"</span>?
            <br />
            <span className="text-destructive font-medium">
              Esta acción no se puede deshacer.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : "Eliminar usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}