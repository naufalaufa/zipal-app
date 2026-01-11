import { createBrowserRouter, Navigate } from "react-router-dom";
import { Login } from "../pages";

const PUBLIC_ROUTES = createBrowserRouter(
    [
        {
            name : 'login',
            path : '/login', 
            element : <Login/>
        },
        {
            name : 'Not Found',
            path : '*', 
            element : <Navigate to='/login'/> 
        }
    ]
)

export default PUBLIC_ROUTES
