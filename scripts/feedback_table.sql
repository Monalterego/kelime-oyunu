-- Supabase dashboard > SQL Editor'da çalıştır

CREATE TABLE IF NOT EXISTS question_feedback (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  word       text        NOT NULL,
  vote       smallint    NOT NULL CHECK (vote IN (1, -1)),
  created_at timestamptz DEFAULT now()
);

-- İndeks: kelime bazlı sorgu için
CREATE INDEX IF NOT EXISTS idx_feedback_word ON question_feedback(word);

-- RLS: herkes insert edebilir, kimse okuyamaz (sadece servis key ile)
ALTER TABLE question_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert" ON question_feedback
  FOR INSERT TO anon WITH CHECK (true);

-- Sonuçları görmek için (dashboard ya da servis key ile):
-- SELECT word, SUM(CASE WHEN vote=1 THEN 1 ELSE 0 END) as likes,
--        SUM(CASE WHEN vote=-1 THEN 1 ELSE 0 END) as dislikes,
--        COUNT(*) as total
-- FROM question_feedback
-- GROUP BY word ORDER BY dislikes DESC;
