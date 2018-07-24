#!/bin/bash

PLUGIN_URL="https://raw.githubusercontent.com/StickmanVentures/ghost-gcs/master/index.js"
PLUGIN_PATH="content/adapters/storage/gcs"

# Do a stupid check to see if we're in a ghost project directory and create the
# directory structure to place the plugin in.
if [ ! -d "./content" ]; then
    (>&2 echo "Cannot find content directory, are you in your project root?")
    exit 1
fi
mkdir -p $PLUGIN_PATH

# Download the plugin from the GitHub master branch and install to content.
if ! hash curl 2>/dev/null; then
    (>&2 echo "Curl is required to download the plugin.")
    exit 1
fi
if ! curl -o "$PLUGIN_PATH/index.js" $PLUGIN_URL; then
    (>&2 echo "Failed to download plugin from GitHub, check your network.")
    exit 1
fi

echo "===============================================================================

The plugin is now installed in your Ghost content directory.
To setup the plugin, add a storage key to your configuration.

Example config:

storage: {
    active: 'gcs',
    gcs: {
        projectId: 'PROJECT_ID',
        keyFilename: './secrets/PRIVATE_KEY_FILE.json',
        bucket: 'BUCKET_NAME'
    }
}"
