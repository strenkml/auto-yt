FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Install youtube-dl
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
RUN chmod a+rx /usr/local/bin/youtube-dl

# Install ffmpeg and atomicparsley
RUN apt update && apt install -y ffmpeg atomicparsley

# Setup /config directory
RUN mkdir -p /config/settings /config/sources

# Bundle app source
COPY . .

# CMD [ "node", "cli.js", "-a -e"]
CMD ["tail", "-f", "/dev/null"]