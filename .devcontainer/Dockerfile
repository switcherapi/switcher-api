FROM node:24-alpine

ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Configure apt and install packages
RUN apk update && \
    apk add --no-cache \
        ca-certificates \
        curl \
        git \
        openssh