#!/usr/bin/env bash
if ! az account show &>/dev/null; then
  echo ""
  echo "  Azure CLI is not logged in."
  echo "  Run: az login"
  echo ""
  exit 1
fi
