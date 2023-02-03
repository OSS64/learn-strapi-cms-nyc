#!/bin/bash
export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh

sudo npm install -g pm2
node -v
npm install
npm run build
pm2 start pm2.prod.config.json
