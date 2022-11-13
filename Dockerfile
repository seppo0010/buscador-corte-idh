FROM ghcr.io/puppeteer/puppeteer:16.1.0

USER root
RUN apt-get update && apt-get install -y \
  gzip \
  poppler-utils \
  python3 \
  wget \
  xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN wget https://nodejs.org/dist/v18.12.1/node-v18.12.1-linux-x64.tar.xz && tar -C /usr/local --strip-components 1 -xf node-v18.12.1-linux-x64.tar.xz && rm node-v18.12.1-linux-x64.tar.xz

USER pptruser
WORKDIR /home/pptruser
COPY --chown=pptruser run.sh .
COPY --chown=pptruser 0-scraping/package.json 0-scraping/package-lock.json 0-scraping/
COPY --chown=pptruser 3-index/package.json 3-index/package-lock.json 3-index/
COPY --chown=pptruser 4-web/package.json 4-web/package-lock.json 4-web/

WORKDIR /home/pptruser/0-scraping/
RUN npm ci

WORKDIR /home/pptruser/3-index/
RUN npm ci

WORKDIR /home/pptruser/4-web/
RUN npm ci

WORKDIR /home/pptruser
COPY --chown=pptruser 0-scraping/ 0-scraping/
COPY --chown=pptruser 1-extract/ 1-extract/
COPY --chown=pptruser 2-structure/ 2-structure/
COPY --chown=pptruser 3-index/ 3-index/
COPY --chown=pptruser 4-web/ 4-web/

ENV DATA_DIR /data
CMD ["./run.sh"]
