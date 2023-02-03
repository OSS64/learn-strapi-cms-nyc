#!/bin/bash


export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
node -v
npm install
npm run build
npm run pm2:prod
