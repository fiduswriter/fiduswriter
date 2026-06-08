# vim: set ts=4 sw=4 sts=0 sta et :
FROM ubuntu:24.04
EXPOSE 8000

# Use build arg to allow overriding version
ARG FIDUSWRITER_VERSION=4.1.4
ENV VERSION=${FIDUSWRITER_VERSION}

# Executing group, with fixed group id
ENV EXECUTING_GROUP=fiduswriter
ENV EXECUTING_GROUP_ID=999

# Executing user, with fixed user id
ENV EXECUTING_USER=fiduswriter
ENV EXECUTING_USER_ID=999

# Data volume, should be owned by 999:999 to ensure the application can
# function correctly. Run `chown 999:999 <data-dir-path>` on the host OS to
# get this right.
VOLUME ["/data"]

# Create user and group with fixed ID, instead of allowing the OS to pick one.
RUN groupadd \
        --system \
        --gid ${EXECUTING_GROUP_ID} \
        ${EXECUTING_GROUP} \
    && useradd \
        --system \
        --create-home \
         --no-log-init \
        --uid ${EXECUTING_USER_ID} \
        --gid ${EXECUTING_GROUP} \
        ${EXECUTING_USER}

# Chain apt-get update, apt-get install and the removal of the lists.
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install -y \
        build-essential \
        gettext \
        git \
        libjpeg-dev \
        npm \
        python3-venv \
        python3-dev \
        python3-pip \
        unzip \
        wget \
        zlib1g-dev \
        curl \
        rsync \
        libmagic-dev \
        software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.14.2 from deadsnakes PPA
RUN add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y \
        python3.14 \
        python3.14-venv \
        python3.14-dev \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.14 as the default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.14 1 \
    && update-alternatives --set python3 /usr/bin/python3.14

# Install Node.js 24.x
RUN curl -sL https://deb.nodesource.com/setup_24.x | bash \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Working directories should be absolute.
WORKDIR /fiduswriter

# Data folder must exist. It could be mapped if you like to make it persistent.
RUN mkdir -p /data/media
RUN chown -R ${EXECUTING_USER}:${EXECUTING_GROUP} /data
RUN chmod -R 755 /data

# Create virtual environment with the right permissions
RUN python3 -m venv venv
RUN chown -R ${EXECUTING_USER}:${EXECUTING_GROUP} /fiduswriter

# Copy source and install from local path
COPY --chown=${EXECUTING_USER}:${EXECUTING_GROUP} . /src

RUN venv/bin/pip install --upgrade setuptools pip wheel \
    && venv/bin/pip install /src[books,citation-api-import,languagetool,ojs,pandoc,gitrepo-export,phplist,payment-paddle,website]

COPY docker/start-fiduswriter.sh /etc/start-fiduswriter.sh
RUN chmod +x /etc/start-fiduswriter.sh

# Make sure the data directory is writable by the Fidus Writer user
USER ${EXECUTING_USER}

CMD ["/bin/sh", "/etc/start-fiduswriter.sh"]
