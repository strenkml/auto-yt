FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Install youtube-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Add apt repo for Python3.6
RUN add-apt-repository ppa:deadsnakes/ppa

# Install ffmpeg and atomicparsley
RUN apt update && apt install -y ffmpeg atomicparsley python3.6

# Make log directory
RUN mkdir -p /var/log/autoyt

# Bundle app source
COPY . .

CMD [ "node", "server.js"]
# CMD ["tail", "-f", "/dev/null"]