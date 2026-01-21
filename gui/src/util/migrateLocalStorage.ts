import { AppDispatch } from "../redux/store";

/**
 * Previously used to migrate persisted tool policies.
 * Tools UI и политики больше не используются в GUI, поэтому миграция стала no-op.
 */
export function migrateLocalStorage(_dispatch: AppDispatch) {
  // Intentionally left blank
}
