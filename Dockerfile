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

# Make log directory
RUN mkdir -p /var/log/autoyt

# Bundle app source
COPY . .

# Create a symlink for autoyt to /usr/local/bin/autoyt
RUN ln -s /usr/src/app/autoyt /usr/local/bin/autoyt

# CMD [ "node", "server.js"]
CMD ["tail", "-f", "/dev/null"]