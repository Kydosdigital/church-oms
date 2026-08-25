-- Church OMS
-- Migration 0015: add the church-level Super Admin role.
--
-- This is deliberately separate from the governance migration that follows.
-- PostgreSQL requires a newly-added enum value to be committed before it can
-- be referenced safely by functions, policies, constraints or indexes.

alter type public.app_role add value if not exists 'super_admin';
