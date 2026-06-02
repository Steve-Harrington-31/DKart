
-- Admin can view all profiles
CREATE POLICY "profiles_admin_select" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view, assign and revoke roles
CREATE POLICY "user_roles_admin_select" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for product images bucket (bucket created via tool)
CREATE POLICY "product_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product_images_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product_images_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
