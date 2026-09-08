import { RouterProvider } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from "./routes"
import { Loading } from "./components"
import { clearSession, isSessionValid, touchSession } from "./authSession"

const App = () => {
  const [authenticated, setAuthenticated] = useState(() => isSessionValid());

  useEffect(() => {
    const checkSession = () => {
      const valid = isSessionValid();
      if (!valid) clearSession();
      setAuthenticated(valid);
    };
    let lastTouch = 0;
    const onActivity = () => {
      if (Date.now() - lastTouch < 60_000) return;
      lastTouch = Date.now();
      touchSession();
    };
    const intervalId = setInterval(checkSession, 30_000);
    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, onActivity, { passive: true }));
    window.addEventListener('focus', checkSession);
    window.addEventListener('auth-session-changed', checkSession);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach(event => window.removeEventListener(event, onActivity));
      window.removeEventListener('focus', checkSession);
      window.removeEventListener('auth-session-changed', checkSession);
    }
  }, []);

  return (
    <>
      {authenticated ? (
        <Suspense fallback={<Loading/>}>
          <RouterProvider router={PRIVATE_ROUTES}/> 
        </Suspense>
      ) : (
        <Suspense fallback={<Loading/>}>
          <RouterProvider router={PUBLIC_ROUTES}/> 
        </Suspense>
      )}
    </>
  )
}

export default App
