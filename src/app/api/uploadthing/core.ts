import { createUploadthing, type FileRouter } from "uploadthing/server";
import { getServerSession } from "@/lib/get-session";

const f = createUploadthing();

// FileRouter para tu aplicación
export const ourFileRouter = {
  // Definir rutas de upload
  gastoImage: f({ image: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      // Verificar autenticación
      const session = await getServerSession();
      
      if (!session?.user) {
        throw new Error("No autorizado");
      }

      // Lo que retornemos aquí estará disponible en onUploadComplete
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completo para userId:", metadata.userId);
      console.log("URL del archivo:", file.ufsUrl);
      
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

