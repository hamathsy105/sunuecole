import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        await supabase.auth.signOut();
        qc.clear();
        navigate({ to: "/login" });
      }}
    >
      <LogOut className="h-4 w-4" />
      <span>Déconnexion</span>
    </Button>
  );
}
