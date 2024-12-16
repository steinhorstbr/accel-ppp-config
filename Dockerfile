FROM python:3.9-slim

WORKDIR /app

COPY ./app /app
COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 5000

VOLUME /etc/accel-ppp.conf

CMD ["python", "app.py"]
