-- Supabase SQL Editor'da bu dosyayı çalıştır.
-- Settings > SQL Editor > New Query > Yapıştır > Run

-- Günlük liderlik: her oyuncu için en yüksek skoru al (günlük zaten 1 oyun, min şart yok)
CREATE OR REPLACE FUNCTION get_leaderboard_daily(daily_num integer)
RETURNS TABLE(
  nickname       text,
  score          integer,
  correct        integer,
  total          integer,
  duration_secs  integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT ON (p.nickname)
    p.nickname,
    s.score,
    s.correct,
    s.total,
    s.duration_seconds
  FROM scores s
  JOIN profiles p ON p.id = s.profile_id
  WHERE s.daily_number = daily_num
    AND s.profile_id IS NOT NULL
  ORDER BY p.nickname, s.score DESC, s.duration_seconds ASC NULLS LAST
  LIMIT 100;
$$;

-- Dönemlik liderlik: oyuncu başına ortalama skor (haftalık / aylık / tüm zamanlar)
-- min_games: tabloya girmek için gereken minimum oyun sayısı
--   Haftalık  → 3
--   Aylık     → 5
--   Tüm zaman → 10
CREATE OR REPLACE FUNCTION get_leaderboard_period(
  start_ts  timestamptz DEFAULT NULL,
  min_games integer     DEFAULT 1
)
RETURNS TABLE(
  nickname      text,
  avg_score     integer,
  games         integer,
  total_correct integer,
  total_total   integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.nickname,
    ROUND(AVG(s.score))::integer   AS avg_score,
    COUNT(*)::integer              AS games,
    SUM(s.correct)::integer        AS total_correct,
    SUM(s.total)::integer          AS total_total
  FROM scores s
  JOIN profiles p ON p.id = s.profile_id
  WHERE s.profile_id IS NOT NULL
    AND (start_ts IS NULL OR s.created_at >= start_ts)
  GROUP BY p.nickname
  HAVING COUNT(*) >= min_games
  ORDER BY avg_score DESC
  LIMIT 100;
$$;
