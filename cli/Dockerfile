FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Make log directory
RUN mkdir -p /var/log/autoyt

# Bundle app source
COPY . .

# Create a symlink for autoyt to /usr/local/bin/autoyt
RUN ln -s /usr/src/app/autoyt /usr/local/bin/autoyt

CMD ["tail", "-f", "/dev/null"]