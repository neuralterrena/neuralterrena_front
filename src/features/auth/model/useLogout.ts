import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return async () => {
    await logout();
    void navigate("/login", { replace: true });
  };
}
