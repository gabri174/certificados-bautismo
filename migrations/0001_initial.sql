CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(template_id);

INSERT OR IGNORE INTO templates (id, name, data_json)
VALUES ('bautismo-clasico', 'Bautismo clásico', '{"paperColor":"#fbfaf4","inkColor":"#1e2c47","accentColor":"#3d7bb8","title":"Bautismo","eyebrow":"Certificado de","subtitle":"Por este medio se certifica que:","body":"Fue bautizado cumpliendo con lo establecido con la Palabra de Dios. Dando testimonio público de su fe y obediencia a Cristo.","quote":"“Por tanto, id, y haced discípulos a todas las naciones, bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo”;","verse":"Mateo 28:19 RVR 1960","name":"Nombre Apellido","date":"8 de Agosto 2026","taxId":"CIF: R4601453F","address":"Calle Periodista Roberto Castrovido 3D, 46014, Valencia.","leftSignature":"APÓSTOL CARLOS HUGO","rightSignature":"APÓSTOL JENNY PAZ","leftRole":"MINISTRO DE CULTO","rightRole":"MINISTRO DE CULTO","logo":"∿∿∿","footerMark":"◒","showFooterBar":true}');
