FROM ubuntu:22.04 AS build

RUN apt-get update && \
    apt-get -y install --no-install-recommends ca-certificates git

# libjxl required for webkit build
# RUN apt-get update && apt-get -y install libbrotli1 libhwy-dev \
#     libsysprof-4-dev build-essential ccache ninja-build

# RUN --mount=type=bind,target=/tmp/libjxl,source=libjxl \
#     dpkg -i /tmp/libjxl/libjxl_0.11.1_amd64.deb && \
#     dpkg -i /tmp/libjxl/libjxl-dev_0.11.1_amd64.deb

# RUN \
#     git clone https://github.com/ianlancetaylor/libbacktrace.git && \
#     cd libbacktrace && \
#     mkdir build && \
#     cd build && \
#     ../configure && \
#     make && \
#     make install

# # install deps
# RUN mkdir -p /opt/webkit

# COPY webkit /webkit

# WORKDIR /webkit

# RUN apt-get update && apt-get -y install cmake ninja-build &&
#     yes | DEBIAN_FRONTEND=noninteractive Tools/gtk/install-dependencies

# RUN --mount=type=cache,target=/root/.ccache \
#     export CCACHE_DIR=/root/.ccache && \
#     export PATH="/usr/lib/ccache:$PATH" && \
#     cmake -DPORT=GTK \
#         -DCMAKE_BUILD_TYPE=Release \
#         -DCMAKE_INSTALL_PREFIX=/opt/webkit \
#         -DUSE_WPE_RENDERER=OFF \
#         -DENABLE_MINIBROWSER=ON \
#         -DENABLE_BUBBLEWRAP_SANDBOX=OFF \
#         -DENABLE_GAMEPAD=OFF \
#         -DENABLE_SPELLCHECK=OFF \
#         -DENABLE_WAYLAND_TARGET=OFF \
#         -DENABLE_WEB_RTC=ON \
#         # -DENABLE_EXPERIMENTAL_FEATURES=ON \
#         -DUSE_OPENJPEG=OFF -GNinja \
#         -DCMAKE_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu \
#         -DCMAKE_INCLUDE_PATH=/usr/include \
#         -DSysProfCapture_INCLUDE_DIR=/usr/include/sysprof-4 \
#         -DJPEGXL_LIBRARY=/usr/lib/x86_64-linux-gnu/libjxl.so.0.11.1 \
#         -DJPEGXL_INCLUDE_DIR=/usr/include && \
#     ninja && \
#     ninja install && \
#     rm -Rf /var/lib/apt/lists/*

COPY webkit-ubuntu-22.04 /opt/webkit

FROM golang:1.22-bullseye AS go

COPY cmd/prism /prism

RUN \
    apt-get update && \
    apt-get install --no-install-recommends -y upx-ucl libx11-dev && \
    cd /prism && \
    GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" && \
    upx /prism/prism && \
    rm -Rf /var/lib/apt/lists/*

FROM browsers/base:7.4.2

COPY --from=build /opt/webkit /opt/webkit
COPY --from=go /prism/prism /usr/bin/

RUN apt-get update && y | /opt/webkit/minibrowser-gtk/install-dependencies.sh --autoinstall
COPY thing.js /opt/thing.js

ENV LD_LIBRARY_PATH /opt/webkit/lib/:${LD_LIBRARY_PATH}

# RUN apt-get update && apt-get -y install libbrotli1 libhwy-dev
# COPY libjxl /tmp/libjxl
# RUN dpkg -i /tmp/libjxl/libjxl_0.11.1_amd64.deb
# RUN dpkg -i /tmp/libjxl/libjxl-dev_0.11.1_amd64.deb

RUN \
    apt-get update && \
    apt-get -y install --no-install-recommends \
        libsoup-3.0-0 \
        libgtk-3-0 \
        libgtk-4-dev \
        libavif-dev \
        libwebp7 \
        libwebpdemux2 \
        libwebpmux3 \
        libsecret-1-0 \
        libhyphen0 \
        libwoff1 \
        libharfbuzz-icu0 \
        libgstreamer-gl1.0-0 \
        libgstreamer-plugins-bad1.0-0 \
        flite1-dev \
        libopenjp2-7 \
        libnotify4 \
        libxslt1.1 \
        libegl1 \
        libatomic1 \
        libopengl0 && \
    ldconfig && \
    apt-get clean && \
    rm -Rf /tmp/* && rm -Rf /var/lib/apt/lists/* && \
    chmod 777 /etc/ssl/certs && \
    mkdir /tmp/ca-certificates && \
    chmod 777 /tmp/ca-certificates

COPY entrypoint.sh /

USER selenium

EXPOSE 4444
ENTRYPOINT ["/entrypoint.sh"]
