import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import School from "@/pages/School";
import Admin from "@/pages/Admin";

function FullLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <span className="loader" />
    </div>
  );
}

function Guard({ role, children }: { role: "school" | "admin"; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <Guard role="school">
            <School />
          </Guard>
        }
      />
      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <Admin />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
