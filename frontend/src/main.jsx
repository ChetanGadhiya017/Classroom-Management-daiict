import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import { PageLoader } from "./components/ui";
import "./index.css";

const AuthPage = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Classes = lazy(() => import("./pages/Classes"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Settings = lazy(() => import("./pages/Settings"));
const ClassLayout = lazy(() => import("./pages/class/ClassLayout"));
const Stream = lazy(() => import("./pages/class/Stream"));
const Classwork = lazy(() => import("./pages/class/Classwork"));
const People = lazy(() => import("./pages/class/People"));
const Attendance = lazy(() => import("./pages/class/Attendance"));
const ClassSettings = lazy(() => import("./pages/class/Settings"));
const AssignmentPage = lazy(() => import("./pages/class/Assignment"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: (n, e) => n < 2 && ![401, 403, 404].includes(e?.status), refetchOnWindowFocus: true } },
});

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function NotFound() {
  return <div className="py-20 text-center"><h1 className="text-5xl font-extrabold">404</h1><p className="muted mt-2">This page doesn't exist.</p><Link className="btn-primary mt-6" to="/">Go home</Link></div>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route element={<Protected><Layout /></Protected>}>
                <Route index element={<Dashboard />} />
                <Route path="classes" element={<Classes />} />
                <Route path="timetable" element={<Timetable />} />
                <Route path="settings" element={<Settings />} />
                <Route path="classes/:classId/assignments/:aid" element={<AssignmentPage />} />
                <Route path="classes/:classId" element={<ClassLayout />}>
                  <Route index element={<Stream />} />
                  <Route path="classwork" element={<Classwork />} />
                  <Route path="people" element={<People />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="settings" element={<ClassSettings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
