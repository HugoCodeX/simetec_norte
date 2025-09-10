import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { SignInForm } from "./(auth)/iniciar-sesion/sign-in-form";

export const metadata: Metadata = {
  title: "Iniciar Sesion",
};

export default async function Home() {
  const session = await getServerSession();
  const user = session?.user;

  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <SignInForm />
    </main>
  );
}
