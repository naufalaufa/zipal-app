import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './automaticTheme.css'
import App from './App'
import Swal from 'sweetalert2'
import AutomaticThemeProvider from './AutomaticThemeProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AutomaticThemeProvider><App /></AutomaticThemeProvider>
  </StrictMode>,
)

const users = sessionStorage.getItem('user');

if (users) {
    try {
        const user = JSON.parse(users);
        const isAdminModalShow = sessionStorage.getItem('admin_welcome_shown');
        if (user.role === 'admin' && !isAdminModalShow) {
            Swal.fire({
                title: "Welcome Admin!",
                text: "Selamat datang kembali, Zipal Admin. Siap Untuk Berinvestasi!",
                icon: "success",
                confirmButtonColor: '#3085d6'
            });
            sessionStorage.setItem('admin_welcome_shown', 'true');
        }

    } catch (error) {
        console.error("Data user di sessionStorage rusak/bukan JSON", error);
    }
}
