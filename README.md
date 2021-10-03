# Auto-YT
## Links
[Dockerhub](https://hub.docker.com/repository/docker/strenkml/auto-yt)
## About
Uses the youtube-dl fork [yt-dlp](https://github.com/yt-dlp/yt-dlp) to automatically download videos, playlists, and channels.
## Installation
### docker-compose ([click here for more info](https://docs.linuxserver.io/general/docker-compose))
#### Option 1: Using the Github Repo
1. Clone the Github repo using `git clone https://github.com/strenkml/auto-yt.git`
1. There is a docker-compose.yml file in the repo, edit the file to setup the volumes for downloads and the config.
1. Run `make docker`

#### Options 2: Manual
```yaml
version: "3.9" # optional since v1.27.0
services:
  mongo:
    image: bitnami/mongodb:latest
    restart: always
    environment:
      MONGODB_REPLICA_SET_MODE: primary
      MONGODB_ROOT_USER: root
      MONGODB_ROOT_PASSWORD: pass
      MONGODB_REPLICA_SET_KEY: replicasetkey123
      MONGODB_ADVERTISED_HOSTNAME: mongo
      MONGODB_DATABASE: autoYT
    ports:
      - 27017:27017
    volumes:
      - mongoData:/bitnami/mongodb:rw
  server:
    image: strenkml/auto-yt:server
    depends_on:
      - mongo
    volumes:
      - LOCAL_DOWNLOAD_LOCATION:/downloads
      - LOCAL_CONFIG_LOCATION:/config
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: pass
      ME_CONFIG_MONGODB_URL: mongodb://root:pass@mongo:27017/
  cli:
    image: strenkml/auto-yt:cli
    depends_on:
      - mongo
    volumes:
      - LOCAL_CONFIG_LOCATION:/config
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: pass
      ME_CONFIG_MONGODB_URL: mongodb://root:pass@mongo:27017/
volumes:
  mongoData:
```
## Usage
Run `docker exec -it {CLI_CONTAINER_NAME} /bin/bash -c "autoyt"` to print the help page.
