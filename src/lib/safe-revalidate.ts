import { revalidatePath } from "next/cache";

export function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Safely ignore if invoked outside active request store
  }
}
