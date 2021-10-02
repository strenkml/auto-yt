FROM node:14-bullseye

# Create tmp directory for installing Python 3.8
WORKDIR /tmp/python-install

# Download source code for Python 3.8
RUN wget https://www.python.org/ftp/python/3.8.12/Python-3.8.12.tar.xz
RUN tar -xf Python-3.8.12.tar.xz
RUN mv Python-3.8.12 /opt/Python-3.8.12

WORKDIR /opt/Python-3.8.12

# Delete temp directory
RUN rm -rf /tmp/python-install

# Install packages for building Python 3.8
RUN apt-get update && apt-get install -y build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libsqlite3-dev libreadline-dev libffi-dev curl libbz2-dev

# Configure and build Python 3.8
RUN ./configure --enable-optimizations --enable-shared
RUN make -j 16

# Install Python 3.8
RUN make altinstall
RUN ldconfig /opt/Python3.8.12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Install youtube-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Install ffmpeg and atomicparsley
RUN apt-get update && apt-get install -y ffmpeg atomicparsley

# Make log directory
RUN mkdir -p /var/log/autoyt

# Bundle app source
COPY . .

CMD [ "node", "server.js"]
# CMD ["tail", "-f", "/dev/null"]