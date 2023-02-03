#!/bin/bash


export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
node -v
npm install
npm run build
sudo pm2 start pm2.prod.config.json
