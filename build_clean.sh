#!/bin/sh -e


snapcraft clean && CRAFT_BUILD_ENVIRONMENT_MEMORY=8G snapcraft
