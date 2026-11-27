-- Cho phép Túi An Yên lưu vỏ sò và khay vỏ sò (Vịnh Yên)
alter table public.anyen_bag_items drop constraint if exists anyen_bag_kind;
alter table public.anyen_bag_items add constraint anyen_bag_kind check (kind in ('thinh','robe','flower','pot','aroma','shell','shelltray'));
