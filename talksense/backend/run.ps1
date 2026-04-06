Write-Host "Starting Backend..."
Start-Process -NoNewWindow -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --port 8003 --host 0.0.0.0"
Write-Host "Starting Frontend..."
cd ..\frontend
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m http.server 3001"
Write-Host "Services started."
