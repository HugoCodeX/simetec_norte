import { put, del } from '@vercel/blob';

// Función para determinar si usar Vercel Blob o almacenamiento local
const useVercelBlob = () => {
  return process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN;
};

// Función para comprimir imagen en el cliente
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calcular nuevas dimensiones (máximo 1200px en el lado más largo)
      const maxSize = 1200;
      let { width, height } = img;

      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx?.drawImage(img, 0, 0, width, height);

      // Convertir a blob con calidad reducida
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.8 // Calidad 80%
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file: File, folder: string = 'gastos'): Promise<string> {
  try {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo se permiten JPG, JPEG y PNG.');
    }

    // Validar tamaño inicial (10MB máximo antes de compresión)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('El archivo es demasiado grande. Máximo 10MB.');
    }

    // Comprimir imagen si es mayor a 1MB
    let fileToUpload = file;
    if (file.size > 1024 * 1024) { // 1MB
      try {
        fileToUpload = await compressImage(file);
      } catch (compressionError) {
        console.warn('Error al comprimir imagen, usando original:', compressionError);
        fileToUpload = file;
      }
    }

    // Validar tamaño final después de compresión
    const maxFinalSize = 5 * 1024 * 1024; // 5MB
    if (fileToUpload.size > maxFinalSize) {
      throw new Error('El archivo comprimido sigue siendo demasiado grande. Máximo 5MB.');
    }

    // Generar nombre único
    const timestamp = Date.now();
    const extension = 'jpg'; // Siempre usar JPG después de compresión
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Subir según el entorno
    if (useVercelBlob()) {
      // Producción: usar Vercel Blob
      const blob = await put(filename, fileToUpload, {
        access: 'public',
      });
      return blob.url;
    } else {
      // Desarrollo: simular upload (guardar en public/uploads)
      const fs = await import('fs/promises');
      const path = await import('path');

      const uploadDir = path.join(process.cwd(), 'public/uploads', folder);
      await fs.mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await fileToUpload.arrayBuffer());
      const localFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.jpg`;
      const filepath = path.join(uploadDir, localFilename);

      await fs.writeFile(filepath, buffer);
      return `/uploads/${folder}/${localFilename}`;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    if (!url) return;

    if (useVercelBlob() && url.includes('vercel-storage.com')) {
      // Producción: eliminar de Vercel Blob
      await del(url);
    } else if (url.startsWith('/uploads/')) {
      // Desarrollo: eliminar archivo local
      const fs = await import('fs/promises');
      const path = await import('path');

      const filepath = path.join(process.cwd(), 'public', url);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        // Archivo no existe, ignorar
      }
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // No lanzamos error aquí para no bloquear otras operaciones
  }
}

// Función para eliminar múltiples archivos de forma eficiente
export async function deleteMultipleImages(urls: string[]): Promise<void> {
  try {
    const validUrls = urls.filter(url => url && url.includes('vercel-storage.com'));

    if (validUrls.length === 0) return;

    // Eliminar en paralelo pero con límite para no sobrecargar
    const batchSize = 5;
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(url => del(url)));
    }
  } catch (error) {
    console.error('Error deleting multiple images:', error);
  }
}