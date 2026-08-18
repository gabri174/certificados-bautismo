-- Estructura para generación individual y masiva de certificados.
-- Mantiene las tablas existentes y añade personas/lotes/metadatos de emisión.

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_people_normalized_name ON people(normalized_name);

CREATE TABLE IF NOT EXISTS certificate_batches (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'manual',
  original_filename TEXT,
  total_count INTEGER NOT NULL DEFAULT 0,
  generated_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certificate_batches_status ON certificate_batches(status);

CREATE TABLE IF NOT EXISTS certificate_recipients (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  person_id TEXT NOT NULL,
  certificate_id TEXT,
  row_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES certificate_batches(id),
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);

CREATE INDEX IF NOT EXISTS idx_certificate_recipients_batch_id ON certificate_recipients(batch_id);
CREATE INDEX IF NOT EXISTS idx_certificate_recipients_person_id ON certificate_recipients(person_id);
CREATE INDEX IF NOT EXISTS idx_certificate_recipients_status ON certificate_recipients(status);

-- Metadatos de emisión sin romper los certificados existentes.
ALTER TABLE certificates ADD COLUMN certificate_number TEXT;
ALTER TABLE certificates ADD COLUMN person_id TEXT;
ALTER TABLE certificates ADD COLUMN status TEXT NOT NULL DEFAULT 'generated';

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_certificate_number
  ON certificates(certificate_number)
  WHERE certificate_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificates_person_id ON certificates(person_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
