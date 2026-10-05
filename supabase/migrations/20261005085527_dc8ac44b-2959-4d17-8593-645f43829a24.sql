ALTER TABLE public.info_items RENAME TO info_board_items;

ALTER TABLE public.info_board_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.info_board_items.sort_order IS 'Manual display order; lower shows first on the public Info Board.';

GRANT SELECT ON public.info_board_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.info_board_items TO authenticated;
GRANT ALL ON public.info_board_items TO service_role;

NOTIFY pgrst, 'reload schema';