#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------
FROM node:22

# The node image includes a non-root user with sudo access. Use the 
# "remoteUser" property in devcontainer.json to use it. On Linux, update 
# these values to ensure the container user's UID/GID matches your local values.
# See https://aka.ms/vscode-remote/containers/non-root-user for details.
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list

# Configure apt and install packages
RUN apt-get update \
    && apt-get -y install --no-install-recommends dialog 2>&1 \ 
    # Verify git and needed tools are installed
    && apt-get -y install git iproute2 procps \
    # Update npm to the latest version
    && npm install -g npm@latest \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# set up a nicer prompt
RUN git clone https://github.com/magicmonty/bash-git-prompt.git ~/.bash-git-prompt --depth=1

RUN echo "source $HOME/.bash-git-prompt/gitprompt.sh" >> ~/.bashrc