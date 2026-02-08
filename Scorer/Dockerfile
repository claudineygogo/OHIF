# Use Python 3.9 slim image for a small footprint
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies if needed (e.g., for numpy/pydicom if they need compilation, though slim usually has enough)
# RUN apt-get update && apt-get install -y gcc

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the references directory structure if it doesn't exist
# (Though COPY . . will copy the 'References' folder if it exists locally)
# RUN mkdir -p References

# Expose the port the app runs on
EXPOSE 5002

# Environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Command to run the application
# Using python directly as in local dev, but gunicorn is recommended for prod.
# For simplicity in this pack, we'll use the script's entry point which uses app.run()
# Note: app.py runs on host='0.0.0.0', port=5002
CMD ["python", "app.py"]
