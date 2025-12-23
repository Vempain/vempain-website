#!/usr/bin/env bash

VERSION=$1

if [ -z "${VERSION}" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

source ~/.env.yarn

pushd .
cd frontend
docker build --secret id=VEMPAIN_ACTION_TOKEN,env=VEMPAIN_ACTION_TOKEN . --tag "vempain-site-frontend:${VERSION}"
cd ../backend
docker build . --tag "vempain-site-backend:${VERSION}"
popd

docker save -o "/var/tmp/vempain-site-backend-${VERSION}.tar"  "vempain-site-backend:${VERSION}"
docker save -o "/var/tmp/vempain-site-frontend-${VERSION}.tar"  "vempain-site-frontend:${VERSION}"

echo "Next transfer the files to the server with:"
echo "scp \"/var/tmp/vempain-site-backend-${VERSION}.tar\" \"/var/tmp/vempain-site-frontend-${VERSION}.tar\" <hostname>:/var/tmp/"