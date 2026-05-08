-- Agrega columna frequency a loans para soportar diaria/semanal/mensual
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'weekly'
CHECK (frequency IN ('daily', 'weekly', 'monthly'));