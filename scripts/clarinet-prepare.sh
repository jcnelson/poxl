#!/usr/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
contracts_dir_rel="${script_dir}/../contracts"
contracts_dir=$(readlink -e "$contracts_dir_rel")
contracts_clarinet_dir="${contracts_dir}/clarinet"
contracts_test_addons_dir="${contracts_dir}/test_addons"

sip10_address="SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-10-ft-standard.ft-trait"
mock_sip10_address="ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.sip-10-ft-standard.ft-trait"

rm -rf "${contracts_clarinet_dir}"
mkdir -p "${contracts_clarinet_dir}"

#
shopt -s nullglob
for f in "${contracts_dir}"/*.clar; do 
  filePath=$(readlink -e "$f")
  fileName=$(basename "${filePath}")
  targetFilePath="${contracts_clarinet_dir}/$fileName"

  cp "${filePath}" "${targetFilePath}"

  sed -i -e "s|${sip10_address}|${mock_sip10_address}|g" "${targetFilePath}"

  # # check if contract have test addon and adds its content to contract file
  if [ -f "${contracts_test_addons_dir}/${fileName}" ]; then
    cat "${contracts_test_addons_dir}/${fileName}" >> "${targetFilePath}"
  fi;
done;
shopt -u nullglob

if ! command -v clarinet &> /dev/null; then
    echo "ERROR: clarinet could not be found"
    exit 1
fi