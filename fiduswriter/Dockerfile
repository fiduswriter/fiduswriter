FROM python:3.8-slim-buster

RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get install -y \
    libpq-dev \
    libjpeg-dev \
    libxslt1-dev \
    libxml2-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-dev \
    libmemcached-dev \
    build-essential \
    gettext

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN mkdir /fiduswriter
WORKDIR /fiduswriter

COPY requirements.txt /fiduswriter/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /fiduswriter/

RUN mkdir /fiduswriter/static-libs
RUN mkdir /fiduswriter/static-transpile

RUN chmod +x /fiduswriter/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/fiduswriter/docker-entrypoint.sh"]
CMD ["runserver", "0.0.0.0:8000"]

