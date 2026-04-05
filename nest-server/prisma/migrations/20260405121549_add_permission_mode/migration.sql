-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_settings" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "language" TEXT NOT NULL DEFAULT 'SYSTEM',
    "theme" TEXT NOT NULL DEFAULT 'SYSTEM',
    "custom_model_configs" TEXT,
    "enabled_models" TEXT,
    "default_model" TEXT,
    "permission_mode" TEXT NOT NULL DEFAULT 'DEFAULT',
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("custom_model_configs", "default_model", "enabled_models", "language", "theme", "updated_at", "user_id") SELECT "custom_model_configs", "default_model", "enabled_models", "language", "theme", "updated_at", "user_id" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
