# Image: ts:doc-generator
FROM debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    build-essential \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NVM_DIR=/usr/local/nvm
# Use LTS version instead of specific version
ENV NODE_VERSION=lts/*

# Install nvm
RUN mkdir -p $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Add NVM to path and install Node.js
RUN echo "export NVM_DIR=\"$NVM_DIR\"" >> /etc/bash.bashrc \
    && echo "[ -s \"$NVM_DIR/nvm.sh\" ] && \. \"$NVM_DIR/nvm.sh\"" >> /etc/bash.bashrc \
    && echo "[ -s \"$NVM_DIR/bash_completion\" ] && \. \"$NVM_DIR/bash_completion\"" >> /etc/bash.bashrc

# Install Node.js with NVM and set as default
SHELL ["/bin/bash", "--login", "-c"]
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Verify installation
RUN node --version
RUN npm --version

# Create ts user with sudo privileges
RUN apt-get update && apt-get install -y sudo \
    && useradd -m ts \
    && echo "ts ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ts \
    && chmod 0440 /etc/sudoers.d/ts

# Switch to ts user
USER ts

# Set working directory to ts home
WORKDIR /home/ts

# Install pandoc from .deb package
RUN sudo apt-get update && sudo apt-get install -y wget \
    && wget https://github.com/jgm/pandoc/releases/download/3.7.0.2/pandoc-3.7.0.2-1-amd64.deb \
    && sudo dpkg -i pandoc-3.7.0.2-1-amd64.deb \
    && rm pandoc-3.7.0.2-1-amd64.deb \
    && sudo rm -rf /var/lib/apt/lists/*

# Install Puppeteer dependencies
RUN sudo apt-get update && sudo apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm-dev \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && sudo rm -rf /var/lib/apt/lists/*

# Create repos directory
RUN mkdir -p /home/ts/repos

# Clone repository, fetch branches, checkout feature/ssr branch
WORKDIR /home/ts/repos
RUN git clone https://github.com/haoyan-ts/doc_template.git \
    && cd doc_template \
    && git fetch --all \
    && git checkout -b release/v0.1.0 origin/release/v0.1.0

# && git fetch --tags \
# && git checkout tags/v0.1.0
# Install npm dependencies
WORKDIR /home/ts/repos/doc_template
RUN source $NVM_DIR/nvm.sh \
    && npm install --unsafe-perm \
    && npm run build

CMD [ "bash" ]