CREATE TABLE IF NOT EXISTS public.lastblock
(
    last_block bigint NOT NULL,
    CONSTRAINT lastblock_pkey PRIMARY KEY (last_block)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.lastblock
    OWNER to {database_owner};

INSERT INTO last_block
  VALUES (block_number);