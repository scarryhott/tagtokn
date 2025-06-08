#!/bin/bash

# Create SSL certificate for localhost
mkdir -p .cert
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout .cert/localhost.key -out .cert/localhost.pem -subj "/C=US/CN=localhost"
echo "SSL certificate created in .cert/ directory"

# Update package.json to use HTTPS
if ! grep -q "HTTPS=true" package.json; then
  sed -i '' 's/"start": "react-scripts start"/"start": "HTTPS=true SSL_CRT_FILE=.cert\/localhost.pem SSL_KEY_FILE=.cert\/localhost.key react-scripts start"/' package.json
  echo "Updated package.json to use HTTPS"
else
  echo "HTTPS already configured in package.json"
fi
