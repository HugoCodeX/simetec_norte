import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-full sm:w-32" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Buscador skeleton */}
            <div className="mb-6">
              <Skeleton className="h-10 w-full sm:w-80" />
            </div>
            
            {/* Skeleton móvil tipo tarjeta */}
            <div className="sm:hidden space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-56" />
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>

            {/* Skeleton de tabla para >= sm */}
            <div className="hidden sm:block space-y-4">
              {/* Header de tabla */}
              <div className="flex gap-4">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
              
              {/* Filas de tabla */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                  <Skeleton className="h-16 flex-1" />
                </div>
              ))}
            </div>
            
            {/* Paginación skeleton */}
            <div className="mt-4 flex justify-center">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}