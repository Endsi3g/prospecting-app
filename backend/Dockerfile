# Dockerfile optimized for FastAPI + Playwright on Free Tiers (Render, Fly.io, HF Spaces)
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy dependencies
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Ensure playwright browsers are installed (though base image has them, it's safe to verify)
RUN playwright install chromium

# Copy application code
COPY . .

# Expose the API port
EXPOSE 8000

# Start server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
