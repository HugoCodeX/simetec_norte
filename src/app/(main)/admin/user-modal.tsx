"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/password-input"
import { createUser, updateUser } from "./actions"
import { authClient } from "@/lib/auth-client"
import { passwordSchema } from "@/lib/validation"
import { toast } from "sonner"

const baseUserSchema = {
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo puede contener letras y espacios"),
  email: z.string()
    .email("Email inválido")
    .max(100, "El email no puede exceder 100 caracteres")
    .toLowerCase(),
}

// Ya no necesitamos esquema para crear usuarios, solo para editar roles

// Esquema para auto-edición (solo rol, opcional)
const selfEditSchema = z.object({
  role: z.enum(["invitado", "usuario", "admin"]).optional(),
})

// Esquema para editar otros usuarios (solo rol)
const editUserSchema = z.object({
  role: z.enum(["invitado", "usuario", "admin"]).describe("Rol del usuario"),
})

type EditUserFormData = z.infer<typeof editUserSchema>
type SelfEditFormData = z.infer<typeof selfEditSchema>
type UserFormData = EditUserFormData | SelfEditFormData

interface User {
  id: string
  name: string
  email: string
  role: string | null
  createdAt: Date
  updatedAt: Date
}

interface UserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  currentUser: {
    id: string;
    role: string;
  }
  onSuccess: () => void
  isEditingSelf?: boolean
}

export function UserModal({ open, onOpenChange, user, currentUser, onSuccess, isEditingSelf = false }: UserModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Determinar qué esquema usar
  const getValidationSchema = () => {
    if (isEditingSelf) return selfEditSchema; // Auto-edición
    return editUserSchema; // Editar otro usuario
  }

  const form = useForm<UserFormData>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: {
      role: "invitado",
    },
  })

  useEffect(() => {
    // Actualizar el resolver cuando cambie el contexto
    const schema = getValidationSchema();
    form.clearErrors();
    
    if (user) {
      // Usar el rol directamente o asignar "invitado" si es null
      let mappedRole: "invitado" | "usuario" | "admin" = "invitado";
      if (user.role === "admin") {
        mappedRole = "admin";
      } else if (user.role === "usuario") {
        mappedRole = "usuario";
      } else if (user.role === "invitado" || user.role === null) {
        mappedRole = "invitado";
      }
      
      // Resetear solo el rol
      form.reset({
        role: mappedRole,
      })
    } else {
      // Si no hay usuario, usar rol por defecto
      form.reset({
        role: "invitado",
      })
    }
  }, [user, form])

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    try {
      if (!user) {
        toast.error("No se ha seleccionado ningún usuario")
        return
      }
      
      if (isEditingSelf) {
        // Auto-edición
        const editData = data as SelfEditFormData;
        
        await updateUser({ id: user.id, role: editData.role || undefined })
        toast.success("Perfil actualizado correctamente")
      } else {
        // Editar rol de otro usuario
        const editData = data as EditUserFormData;
        
        await updateUser({ id: user.id, role: editData.role })
        toast.success("Rol de usuario actualizado correctamente")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al actualizar rol:", error)
      
      // Manejo específico de errores
      let errorMessage = "Error al actualizar el rol"
      
      if (error instanceof Error) {
        if (error.message.includes("role")) {
          errorMessage = "Error en el rol seleccionado"
          form.setError("role", { message: "Rol inválido" })
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
          Editar Rol de Usuario
        </DialogTitle>
          <DialogDescription>
            Actualiza el rol del usuario seleccionado
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isEditingSelf}
                  >
                    <FormControl>
                      <SelectTrigger className={isEditingSelf ? "opacity-50 cursor-not-allowed" : ""}>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="invitado">Invitado</SelectItem>
                      <SelectItem value="usuario">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEditingSelf && (
                    <p className="text-sm text-muted-foreground">
                      No puedes cambiar tu propio rol
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar Rol"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}