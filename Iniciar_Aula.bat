@echo off
echo Iniciando la Guía Tiny Kids...
cd /d "%~dp0"
echo.
echo === INSTRUCCIONES PARA COMPARTIR ===
echo Para que otros entren, dales este link:
echo http://192.168.0.138:5173
echo (Asegúrate de que estén en el mismo Wi-Fi)
echo =====================================
echo.
start http://localhost:5173
npm run dev -- --host
pause
