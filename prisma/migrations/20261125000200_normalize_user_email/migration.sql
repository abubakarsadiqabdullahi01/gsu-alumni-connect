-- The unique email constraint makes this statement fail atomically if two
-- accounts would acquire the same address. Resolve ownership before retrying.
UPDATE "user" SET email = lower(email) WHERE email <> lower(email);
