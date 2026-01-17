import { createBrowserRouter} from "react-router-dom";
import {  Agreement, Dashboard, History, Investment, LogActivities, Profile, Purpose } from "../pages";
import { UserLayout } from "../components";
import NotFound from "../pages/NotFound";

const PRIVATE_ROUTES = createBrowserRouter(
    [
        {
            name : 'dashboard',
            path : '/dashboard', 
            element : <UserLayout/>,
            children : [
                {
                    index: true,
                    element : <Dashboard/>,
                },
                {
                    path : 'history' ,
                    element : <History/>
                },
                {
                    path : 'investment' ,
                    element : <Investment/>
                },
                {
                    path : 'purpose' ,
                    element : <Purpose/>
                },
                {
                    path : 'profile' ,
                    element : <Profile/>
                },
                {
                    path : 'agreement' ,
                    element : <Agreement/>
                },
                {
                    path : 'logactivities' ,
                    element : <LogActivities/>
                },
            ]
        },
        {
            name : 'Not Found',
            path : '*', 
            errorElement : <NotFound/> 
        }
    ]
)

export default PRIVATE_ROUTES
