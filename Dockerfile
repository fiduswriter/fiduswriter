FROM ubuntu:16.04
MAINTAINER David A. Lareo

ENV EXECUTING_USER fiduswriter
RUN groupadd --system ${EXECUTING_USER} && useradd --system --create-home --gid ${EXECUTING_USER}  ${EXECUTING_USER} 

RUN apt-get update
RUN apt-get install -y libjpeg-dev python python-dev python-pip python-virtualenv gettext zlib1g-dev git npm nodejs nodejs-legacy libpq-dev wget

COPY . /fiduswriter
VOLUME ["/data"]

WORKDIR /fiduswriter
RUN mkdir static-libs
RUN cp configuration.py-default configuration.py

RUN chmod -R 777 /data
RUN chmod -R 777 /fiduswriter

USER ${EXECUTING_USER}

RUN virtualenv venv
RUN /bin/bash -c "source venv/bin/activate"

RUN pip install -r requirements.txt
RUN pip install -r postgresql-requirements.txt

EXPOSE 8000

RUN python manage.py init

COPY docker-entrypoint.sh /fiduswriter
CMD sh "/fiduswriter/docker-entrypoint.sh"
