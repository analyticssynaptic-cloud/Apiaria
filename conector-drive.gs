/* ════════════════════════════════════════════════════════════
   ApiarIA Studio · CONECTOR DRIVE (Google Apps Script)
   Puente entre tu colmena (GitHub Pages) y tu Google Drive.

   CÓMO INSTALARLO (5 minutos):
   1. Entra a https://script.google.com → "Nuevo proyecto"
   2. Borra todo y pega este archivo completo.
   3. Cambia la CLAVE por una contraseña tuya (línea de abajo).
   4. (Opcional) Pon el ID de una carpeta de Drive en CARPETA_ID
      para que la colmena trabaje solo dentro de esa carpeta.
      El ID es lo que va después de /folders/ en la URL de la
      carpeta. Si lo dejas vacío, usa una carpeta nueva llamada
      "ApiarIA" en la raíz de tu Drive (se crea sola).
   5. Implementar → Nueva implementación → tipo "Aplicación web"
        - Ejecutar como: YO (tu cuenta)
        - Quién tiene acceso: CUALQUIER PERSONA
      → Implementar → autoriza los permisos → copia la URL /exec
   6. En ApiarIA Studio: Conectores ＋ → pega nombre, URL y la
      misma CLAVE. Listo.

   SEGURIDAD: la CLAVE evita que cualquiera que descubra tu URL
   use tu Drive. No la compartas. El conector solo puede tocar
   la carpeta configurada.
   ════════════════════════════════════════════════════════════ */

const CLAVE = "CAMBIA-ESTA-CLAVE";   // ← tu contraseña secreta
const CARPETA_ID = "";               // ← ID de carpeta (opcional)

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.clave !== CLAVE) return respuesta({ ok: false, error: "Clave incorrecta" });

    const carpeta = obtenerCarpeta();

    /* ── LISTAR archivos de la carpeta ── */
    if (d.accion === "listar") {
      const archivos = [];
      const it = carpeta.getFiles();
      while (it.hasNext() && archivos.length < 100) {
        const f = it.next();
        archivos.push({ id: f.getId(), nombre: f.getName() });
      }
      return respuesta({ ok: true, archivos: archivos });
    }

    /* ── LEER el contenido de un archivo (texto) ── */
    if (d.accion === "leer") {
      const f = DriveApp.getFileById(d.id);
      let contenido;
      const mime = f.getMimeType();
      if (mime === MimeType.GOOGLE_DOCS) {
        contenido = DocumentApp.openById(d.id).getBody().getText();
      } else if (mime === MimeType.GOOGLE_SHEETS) {
        const hoja = SpreadsheetApp.openById(d.id).getSheets()[0];
        contenido = hoja.getDataRange().getValues().map(fila => fila.join("\t")).join("\n");
      } else {
        contenido = f.getBlob().getDataAsString("UTF-8");
      }
      return respuesta({ ok: true, contenido: contenido.slice(0, 100000) });
    }

    /* ── GUARDAR una pieza HTML en Drive ── */
    if (d.accion === "guardar") {
      const nombre = (d.nombre || "pieza-apiaria.html").replace(/[\\/:*?"<>|]/g, "-");
      const archivo = carpeta.createFile(nombre, d.contenido, "text/html");
      archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return respuesta({ ok: true, url: archivo.getUrl(), id: archivo.getId() });
    }

    return respuesta({ ok: false, error: "Acción desconocida: " + d.accion });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  }
}

/* Prueba rápida en el navegador: abre la URL /exec y debe responder */
function doGet() {
  return respuesta({ ok: true, mensaje: "Conector ApiarIA activo", carpeta: obtenerCarpeta().getName() });
}

function obtenerCarpeta() {
  if (CARPETA_ID) return DriveApp.getFolderById(CARPETA_ID);
  const it = DriveApp.getFoldersByName("ApiarIA");
  return it.hasNext() ? it.next() : DriveApp.createFolder("ApiarIA");
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
