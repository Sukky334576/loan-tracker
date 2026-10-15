import fs from "fs";
import path from "path";
import { DB_BASE64 } from "./db-base64";

const BLOB_FILENAME = "loan_tracker_db.sqlite";
const TMP_DB_PATH = path.join("/tmp", "prod.db");

let lastSyncedEtag: string | null = null;

/**
 * Ensures the SQLite database on Vercel is in sync with the persistent Vercel Blob store.
 */
export async function syncDbFromBlob(): Promise<void> {
  if (!process.env.VERCEL) {
    return;
  }

  try {
    const { list, get, put } = await import("@vercel/blob");

    // 1. List blobs to find our database file
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const dbBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

    if (dbBlob) {
      // If we don't have the file locally, or if remote etag has changed
      const localExists = fs.existsSync(TMP_DB_PATH);
      if (!localExists || lastSyncedEtag !== dbBlob.etag) {
        const res = await get(dbBlob.url, { access: "private" });
        if (res && res.stream) {
          const buffer = Buffer.from(await new Response(res.stream).arrayBuffer());
          fs.writeFileSync(TMP_DB_PATH, buffer);
          lastSyncedEtag = dbBlob.etag;
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
        });
        lastSyncedEtag = uploaded.etag;
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
    });

    lastSyncedEtag = uploaded.etag;
  } catch (error) {
    console.error("Error in saveDbToBlob:", error);
  }
}
