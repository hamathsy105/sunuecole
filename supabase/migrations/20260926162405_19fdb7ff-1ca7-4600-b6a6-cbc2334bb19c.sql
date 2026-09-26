CREATE POLICY "Admins create subscription receipts"
ON public.subscription_receipts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND approved_by = auth.uid());

ALTER FUNCTION public.approve_school_subscription(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.approve_school_subscription(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_school_subscription(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_school_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_school_subscription(uuid) TO service_role;