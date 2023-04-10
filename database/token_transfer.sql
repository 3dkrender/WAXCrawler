-- Table: public.token_transfer

-- DROP TABLE IF EXISTS public.token_transfer;

CREATE TABLE IF NOT EXISTS public.token_transfer
(
    tx_id character varying(256) COLLATE pg_catalog."default" NOT NULL,
    sender character varying(12) COLLATE pg_catalog."default" NOT NULL,
    receiver character varying(12) COLLATE pg_catalog."default" NOT NULL,
    token_name character varying(12) COLLATE pg_catalog."default" NOT NULL,
    amount bigint NOT NULL,
    memo character varying(256) COLLATE pg_catalog."default",
    at_block bigint NOT NULL,
    at_time bigint NOT NULL,
    CONSTRAINT token_transfer_pkey PRIMARY KEY (tx_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.token_transfer
    OWNER to {database_owner};