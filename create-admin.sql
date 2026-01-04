INSERT INTO "AdminUser" (
  "name",
  "email",
  "passwordHash",
  "isActive",
  "isTwoFactorEnabled",
  "updatedAt"
)
VALUES (
  'Admin RT Laser',
  'admin@rtlaser.com',
  '$2b$10$f6DN0L0U1yUgbZV8fvIsU.iue633hJcGFVQYnTUsvTFEbJXd9ubXa',
  true,
  false,
  CURRENT_TIMESTAMP
);
