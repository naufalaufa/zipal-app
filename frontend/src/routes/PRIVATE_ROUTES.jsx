import { createBrowserRouter, Navigate } from "react-router-dom";
import { Agreement, Dashboard, History, Investment, Profile, Purpose } from "../pages";
import { UserLayout } from "../components";

const PRIVATE_ROUTES = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />
    },
    {
        name: 'dashboard',
        path: '/dashboard',
        element: <UserLayout />,
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            {
                path: 'history',
                element: <History />
            },
            {
                path: 'investment',
                element: <Investment />
            },
            {
                path: 'purpose',
                element: <Purpose />
            },
            {
                path: 'profile',
                element: <Profile />
            },
            {
                path: 'agreement',
                element: <Agreement />
            },
        ]
    },
    {
        name: 'Not Found',
        path: '*',
        element: <Navigate to="/dashboard" replace />
    }
]);

export default PRIVATE_ROUTES;