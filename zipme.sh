#!/bin/bash

if [[ -f './bookmarker.zip' ]]; then
  \rm -i './bookmarker.zip'
  if [[ -f './bookmarker.zip' ]]; then
    echo >&2 'Cannot continue while the old .zip exists'
    exit 1
  fi
fi

echo "Zipping..."
zip -r -q './bookmarker.zip' res/ src/ manifest.json