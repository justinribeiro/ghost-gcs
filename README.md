# Ghost GCS - A Plugin for Google Cloud Storage integration

A content plugin for Ghost that adds support for storing images on Google Cloud
Storage. We plan to expand this to work with themes in the future as part of
our work to make Ghost work better on ephemeral hosts.

## Installation

To install you can either run the following command or download, audit, and
run the script manually. This should be run in your Ghost project directory.

```shell
curl https://raw.githubusercontent.com/StickmanVentures/ghost-gcs/master/install.sh | bash
```

## Configuration

Add the following configuration to your ghost `config.js` with your project id,
bucket, and key substituted under the environment of your choosing.

```javascript
storage: {
    active: 'gcs',
    gcs: {
        projectId: 'PROJECT_ID',
        keyFilename: './secrets/PRIVATE_KEY_FILE.json',
        bucket: 'BUCKET_NAME'
    }
}
```

## In action

![gcs_showcase](https://user-images.githubusercontent.com/643503/28224349-96d2b17e-6883-11e7-956e-f18916f63fe1.png)

## License

Copyright 2017 Stickman Ventures

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
