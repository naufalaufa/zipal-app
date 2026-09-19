import { createBrowserRouter , Navigate} from "react-router-dom";
import {  Agreement, Dashboard, FinancialAnalytics, History, Investment, LogActivities, Profile, Purpose } from "../pages";
import { UserLayout } from "../components";
import RouteError from '../components/RouteError';
const PRIVATE_ROUTES = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />
    },
    {
        name: 'dashboard',
        path: '/dashboard',
        element: <UserLayout />,
        errorElement: <RouteError />,
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
                errorElement: <RouteError />,
                element: <Purpose />    
            },
            {
                path: 'analytics',
                errorElement: <RouteError />,
                element: <FinancialAnalytics />
            },
            {
                path: 'profile',
                element: <Profile />
            },
            {
                path: 'agreement',
                element: <Agreement />
            },
            {
                path : 'logactivities' ,
                element : <LogActivities/>
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
