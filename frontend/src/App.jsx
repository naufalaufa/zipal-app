import { RouterProvider } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from "./routes"
import { Loading } from "./components"

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('user'));

  useEffect(() => {
    const checkToken = () => {
      const currentToken = localStorage.getItem('user');
      
      if (currentToken !== token) {
        setToken(currentToken);
      }
    };

    const intervalId = setInterval(checkToken, 1000);
    window.addEventListener('storage', checkToken);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', checkToken);
    }
  }, [token]); 

  return (
    <>
      {token ? (
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