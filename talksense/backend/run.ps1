Write-Host "Starting Backend..."
Start-Process -NoNewWindow -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --port 8002 --host 127.0.0.1"
Write-Host "Starting Frontend..."
cd ..\frontend
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m http.server 3001"
Write-Host "Services started."
