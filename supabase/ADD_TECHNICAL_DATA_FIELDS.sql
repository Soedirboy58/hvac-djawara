-- Add technical data fields to technician_work_logs table
-- Based on CSV format: SPK Kerja.csv

ALTER TABLE technician_work_logs
-- Pengukuran Data (5 columns each)
ADD COLUMN IF NOT EXISTS mcb_1 NUMERIC,
ADD COLUMN IF NOT EXISTS mcb_2 NUMERIC,
ADD COLUMN IF NOT EXISTS mcb_3 NUMERIC,
ADD COLUMN IF NOT EXISTS mcb_4 NUMERIC,
ADD COLUMN IF NOT EXISTS mcb_5 NUMERIC,

ADD COLUMN IF NOT EXISTS volt_1 NUMERIC,
ADD COLUMN IF NOT EXISTS volt_2 NUMERIC,
ADD COLUMN IF NOT EXISTS volt_3 NUMERIC,
ADD COLUMN IF NOT EXISTS volt_4 NUMERIC,
ADD COLUMN IF NOT EXISTS volt_5 NUMERIC,

ADD COLUMN IF NOT EXISTS ampere_total_1 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_total_2 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_total_3 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_total_4 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_total_5 NUMERIC,

ADD COLUMN IF NOT EXISTS ampere_kompressor_1 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kompressor_2 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kompressor_3 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kompressor_4 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kompressor_5 NUMERIC,

ADD COLUMN IF NOT EXISTS ampere_kipas_1 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kipas_2 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kipas_3 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kipas_4 NUMERIC,
ADD COLUMN IF NOT EXISTS ampere_kipas_5 NUMERIC,

ADD COLUMN IF NOT EXISTS tekanan_tinggi_1 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_tinggi_2 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_tinggi_3 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_tinggi_4 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_tinggi_5 NUMERIC,

ADD COLUMN IF NOT EXISTS tekanan_rendah_1 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_rendah_2 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_rendah_3 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_rendah_4 NUMERIC,
ADD COLUMN IF NOT EXISTS tekanan_rendah_5 NUMERIC,

ADD COLUMN IF NOT EXISTS kondensor_in_out_1 NUMERIC,
ADD COLUMN IF NOT EXISTS kondensor_in_out_2 NUMERIC,
ADD COLUMN IF NOT EXISTS kondensor_in_out_3 NUMERIC,
ADD COLUMN IF NOT EXISTS kondensor_in_out_4 NUMERIC,
ADD COLUMN IF NOT EXISTS kondensor_in_out_5 NUMERIC,

ADD COLUMN IF NOT EXISTS evaporator_in_out_1 NUMERIC,
ADD COLUMN IF NOT EXISTS evaporator_in_out_2 NUMERIC,
ADD COLUMN IF NOT EXISTS evaporator_in_out_3 NUMERIC,
ADD COLUMN IF NOT EXISTS evaporator_in_out_4 NUMERIC,
ADD COLUMN IF NOT EXISTS evaporator_in_out_5 NUMERIC,

ADD COLUMN IF NOT EXISTS temp_ruang_1 NUMERIC,
ADD COLUMN IF NOT EXISTS temp_ruang_2 NUMERIC,
ADD COLUMN IF NOT EXISTS temp_ruang_3 NUMERIC,
ADD COLUMN IF NOT EXISTS temp_ruang_4 NUMERIC,
ADD COLUMN IF NOT EXISTS temp_ruang_5 NUMERIC,

ADD COLUMN IF NOT EXISTS lain_lain TEXT,

-- Riwayat Pekerjaan
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS tindakan TEXT,
ADD COLUMN IF NOT EXISTS biaya NUMERIC,
ADD COLUMN IF NOT EXISTS lama_kerja NUMERIC,
ADD COLUMN IF NOT EXISTS jarak_tempuh NUMERIC,

-- Catatan
ADD COLUMN IF NOT EXISTS catatan_perbaikan TEXT,

-- Dokumentasi Photos (array of URLs)
ADD COLUMN IF NOT EXISTS documentation_photos TEXT[],

-- Completion timestamp
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN technician_work_logs.documentation_photos IS 'Array of photo URLs for work documentation (max 10 photos)';
COMMENT ON COLUMN technician_work_logs.problem IS 'Problem description from technical report';
COMMENT ON COLUMN technician_work_logs.tindakan IS 'Action taken / solution implemented';
COMMENT ON COLUMN technician_work_logs.completed_at IS 'Timestamp when technical data was completed';
