FROM python:3.9-slim

# Instalar apenas o essencial
RUN apt-get update && \
    apt-get install -y \
    util-linux \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./app /app
COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 5000

VOLUME ["/etc/accel-ppp.conf"]

CMD ["python", "app.py"]
