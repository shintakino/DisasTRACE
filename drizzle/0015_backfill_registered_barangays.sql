-- Preserve the barangay selected at registration for existing mobile users.
-- Earlier clients stored it inside the comma-separated address only; the
-- current registration flow now writes users.barangay directly.
WITH official_barangays(name) AS (
  VALUES
    ('Bagong Nayon'), ('Barangca'), ('Calantipay'), ('Catulinan'),
    ('Concepcion'), ('Hinukay'), ('Makinabang'), ('Matangtubig'),
    ('Pagala'), ('Paitan'), ('Piel'), ('Pinagbarilan'), ('Poblacion'),
    ('Sabang'), ('San Jose'), ('San Roque'), ('Santa Barbara'),
    ('Santo Cristo'), (U&'Santo Ni\00F1o'), ('Subic'), ('Sulivan'), ('Tangos'),
    ('Tarcan'), ('Tiaong'), ('Tibag'), ('Tilapayong'), ('Virgen delas Flores')
)
UPDATE public.users AS u
SET barangay = b.name,
    updated_at = now()
FROM official_barangays AS b
WHERE u.barangay IS NULL
  AND u.address IS NOT NULL
  AND upper(trim(split_part(u.address, ',', 2))) = upper(b.name);
