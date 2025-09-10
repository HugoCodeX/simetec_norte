"use server";

import { getServerSession } from "@/lib/get-session";
import { forbidden, unauthorized } from "next/navigation";
import { setTimeout } from "node:timers/promises";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreateUserData {
  name: string;
  email: string;
  role?: string;
}

interface UpdateUserData {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

async function checkAdminAuth() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();
  if (user.role !== "admin") forbidden();
  
  return user;
}

export async function getUsers() {
  await checkAdminAuth();
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        image: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function createUser(data: CreateUserData) {
  await checkAdminAuth();
  
  try {
    // Validar datos de entrada
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('name: El nombre debe tener al menos 2 caracteres');
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('email: Email inválido');
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });
    
    if (existingUser) {
      throw new Error('email: Este email ya está registrado');
    }
    
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name.trim(),
        email: data.email.toLowerCase(),
        role: data.role || 'invitado',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    revalidatePath('/admin');
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error inesperado al crear el usuario');
  }
}

// Función específica para que los usuarios se editen a sí mismos
export async function updateSelfUser(data: UpdateUserData) {
  const currentUser = await checkAdminAuth();
  
  try {
    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: data.id }
    });
    
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }
    
    // Validar datos de entrada (solo nombre y email)
    if (data.name && data.name.trim().length < 2) {
      throw new Error('name: El nombre debe tener al menos 2 caracteres');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('email: Email inválido');
    }
    
    // Verificar email único si se está actualizando
    if (data.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });
      
      // Solo es error si existe otro usuario con ese email (no el mismo usuario)
      if (emailExists && emailExists.id !== data.id) {
        throw new Error('email: Este email ya está en uso');
      }
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Solo permitir actualizar nombre y email, NO el rol
    if (data.name) updateData.name = data.name.trim();
    if (data.email) updateData.email = data.email.toLowerCase();
    
    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData
    });
    
    revalidatePath('/admin');
    return user;
  } catch (error) {
    console.error('Error updating self user:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error inesperado al actualizar tu perfil');
  }
}

export async function updateUser(data: UpdateUserData) {
  const currentUser = await checkAdminAuth();
  
  // Si el usuario se está editando a sí mismo, usar función específica
  if (currentUser.id === data.id) {
    return await updateSelfUser(data);
  }
  
  try {
    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: data.id }
    });
    
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }
    
    // Validar datos de entrada
    if (data.name && data.name.trim().length < 2) {
      throw new Error('name: El nombre debe tener al menos 2 caracteres');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('email: Email inválido');
    }
    
    // Verificar email único si se está actualizando
    if (data.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });
      
      // Solo es error si existe otro usuario con ese email (no el mismo usuario)
      if (emailExists && emailExists.id !== data.id) {
        throw new Error('email: Este email ya está en uso');
      }
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (data.name) updateData.name = data.name.trim();
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.role !== undefined) updateData.role = data.role;
    
    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData
    });
    
    revalidatePath('/admin');
    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error inesperado al actualizar el usuario');
  }
}

export async function deleteUser(userId: string) {
  const currentUser = await checkAdminAuth();
  
  if (currentUser.id === userId) {
    throw new Error('No puedes eliminar tu propia cuenta');
  }
  
  try {
    // Verificar que el usuario existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userToDelete) {
      throw new Error('Usuario no encontrado');
    }
    
    await prisma.user.delete({
      where: { id: userId }
    });
    
    revalidatePath('/admin');
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error inesperado al eliminar el usuario');
  }
}

export async function deleteApplication() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  if (user.role !== "admin") forbidden();

  // Delete app...

  await setTimeout(800);
}
