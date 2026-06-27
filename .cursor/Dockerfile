# Base image for Cursor Cloud Agents running this repo.
# Installs Node + Docker + Supabase CLI so the local Supabase backend
# (Auth/Postgres/RLS) can run without relying on a saved snapshot.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Base tooling
RUN apt-get update && apt-get install -y \
      ca-certificates curl gnupg git sudo build-essential \
      fuse-overlayfs iptables \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 (NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Docker engine
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Docker-in-Docker workaround for the Firecracker kernel:
# fuse-overlayfs storage driver + containerd snapshotter disabled,
# and iptables-legacy (nftables is not fully supported by the kernel).
RUN mkdir -p /etc/docker \
    && printf '{\n  "storage-driver": "fuse-overlayfs",\n  "features": { "containerd-snapshotter": false }\n}\n' > /etc/docker/daemon.json \
    && update-alternatives --set iptables /usr/sbin/iptables-legacy \
    && update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Supabase CLI (shim + supabase-go must stay co-located)
RUN curl -fsSL -o /tmp/supabase.tar.gz "https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz" \
    && mkdir -p /usr/local/share/supabase \
    && tar -xzf /tmp/supabase.tar.gz -C /usr/local/share/supabase \
    && ln -sf /usr/local/share/supabase/supabase /usr/local/bin/supabase \
    && ln -sf /usr/local/share/supabase/supabase-go /usr/local/bin/supabase-go \
    && rm /tmp/supabase.tar.gz

# Let the default 'ubuntu' user use Docker and passwordless sudo
RUN groupadd -f docker \
    && usermod -aG docker ubuntu \
    && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

USER ubuntu
