FROM node:14-bullseye

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