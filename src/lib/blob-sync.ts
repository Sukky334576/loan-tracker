import fs from "fs";
import path from "path";
import { DB_BASE64 } from "./db-base64";
import { ensureSafeMigrations } from "./db-migrate";

const BLOB_FILENAME = "loan_tracker_db.sqlite";
const TMP_DB_PATH = path.join("/tmp", "prod.db");

let lastSyncedEtag: string | null = null;
let lastSyncedTime: number = 0;

/**
 * Ensures the SQLite database on Vercel is in sync with the persistent Vercel Blob store.
 * @param force If true, bypasses in-memory caching and forces a fresh download from Blob.
 */
export async function syncDbFromBlob(force: boolean = false): Promise<void> {
  if (!process.env.VERCEL) {
    // Local dev: ensure local DB exists
    if (!fs.existsSync(TMP_DB_PATH) && process.env.NODE_ENV === "production") {
      try {
        const buffer = Buffer.from(DB_BASE64, "base64");
        fs.writeFileSync(TMP_DB_PATH, buffer);
      } catch (e) {
        console.error("Local DB initialization error:", e);
      }
    }
    await ensureSafeMigrations().catch(() => {});
    return;
  }

  try {
    const { list, put, get } = await import("@vercel/blob");

    // 1. List blobs with prefix to find our database file
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const dbBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

    if (dbBlob) {
      const localExists = fs.existsSync(TMP_DB_PATH);
      const remoteUploadedTime = new Date(dbBlob.uploadedAt).getTime();
      const needsSync =
        force ||
        !localExists ||
        lastSyncedEtag !== dbBlob.etag ||
        remoteUploadedTime > lastSyncedTime;

      if (needsSync) {
        // Cache-busted URL with no-cache headers to prevent CDN/Edge caching
        const cacheBustUrl = `${dbBlob.url}${dbBlob.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
        
        let downloadedBuffer: Buffer | null = null;

        try {
          const fetchRes = await fetch(cacheBustUrl, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
              ...(process.env.BLOB_READ_WRITE_TOKEN && {
                Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
              }),
            },
          });

          if (fetchRes.ok) {
            const arrayBuf = await fetchRes.arrayBuffer();
            if (arrayBuf.byteLength > 0) {
              downloadedBuffer = Buffer.from(arrayBuf);
            }
          }
        } catch (fetchErr) {
          console.warn("Direct fetch with cache-busting failed, falling back to blob get():", fetchErr);
        }

        // Fallback to official SDK get() if direct fetch didn't return a buffer
        if (!downloadedBuffer) {
          const blobGetRes = await get(dbBlob.url, { access: "private" });
          if (blobGetRes && blobGetRes.stream) {
            downloadedBuffer = Buffer.from(await new Response(blobGetRes.stream).arrayBuffer());
          }
        }

        if (downloadedBuffer && downloadedBuffer.byteLength > 0) {
          fs.writeFileSync(TMP_DB_PATH, downloadedBuffer);
          lastSyncedEtag = dbBlob.etag;
          lastSyncedTime = remoteUploadedTime;
        }
      }
    } else {
      // No blob in remote storage yet. Initialize from DB_BASE64 and upload.
      if (!fs.existsSync(TMP_DB_PATH) || fs.statSync(TMP_DB_PATH).size < 10000) {
        const buffer = Buffer.from(DB_BASE64, "base64");
        fs.writeFileSync(TMP_DB_PATH, buffer);
      }

      if (fs.existsSync(TMP_DB_PATH)) {
        const fileContent = fs.readFileSync(TMP_DB_PATH);
        const uploaded = await put(BLOB_FILENAME, fileContent, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
        });
        lastSyncedEtag = uploaded.etag;
        lastSyncedTime = Date.now();
      }
    }
  } catch (error) {
    console.error("Error in syncDbFromBlob:", error);
    // Fallback: make sure at least local /tmp/prod.db exists
    if (!fs.existsSync(TMP_DB_PATH)) {
      try {
        const buffer = Buffer.from(DB_BASE64, "base64");
        fs.writeFileSync(TMP_DB_PATH, buffer);
      } catch (e) {
        console.error("Failed fallback DB creation:", e);
      }
    }
  } finally {
    await ensureSafeMigrations().catch(() => {});
  }
}

/**
 * Uploads the updated SQLite database from /tmp/prod.db to persistent Vercel Blob storage.
 */
export async function saveDbToBlob(): Promise<void> {
  if (!process.env.VERCEL) {
    return;
  }

  try {
    if (!fs.existsSync(TMP_DB_PATH)) return;

    const { put } = await import("@vercel/blob");
    const fileBuffer = fs.readFileSync(TMP_DB_PATH);

    const uploaded = await put(BLOB_FILENAME, fileBuffer, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });

    lastSyncedEtag = uploaded.etag;
    lastSyncedTime = Date.now();
  } catch (error) {
    console.error("Error in saveDbToBlob:", error);
  }
}
