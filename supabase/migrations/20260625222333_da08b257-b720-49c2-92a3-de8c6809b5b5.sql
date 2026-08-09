
create policy "anyone read page-images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'page-images');
create policy "admin upload page-images" on storage.objects for insert to authenticated
  with check (bucket_id = 'page-images' and public.has_role(auth.uid(), 'admin'));
create policy "admin update page-images" on storage.objects for update to authenticated
  using (bucket_id = 'page-images' and public.has_role(auth.uid(), 'admin'));
create policy "admin delete page-images" on storage.objects for delete to authenticated
  using (bucket_id = 'page-images' and public.has_role(auth.uid(), 'admin'));
