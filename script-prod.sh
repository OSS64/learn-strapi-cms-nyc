#!/bin/bash


export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
npx kill-port 1337 -y
yarn install
yarn build
yarn start
